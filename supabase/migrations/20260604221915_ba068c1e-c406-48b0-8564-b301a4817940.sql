
-- 1. Email prefs column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_prefs jsonb NOT NULL DEFAULT
  '{"lesson_scheduled":true,"lesson_cancelled":true,"lesson_reminder":true,"report_card":true,"intake_status":true}'::jsonb;

-- 2. Reminder dedupe table
CREATE TABLE IF NOT EXISTS public.lesson_reminder_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('24h','1h')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, kind)
);
GRANT SELECT ON public.lesson_reminder_sends TO authenticated;
GRANT ALL ON public.lesson_reminder_sends TO service_role;
ALTER TABLE public.lesson_reminder_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read reminders" ON public.lesson_reminder_sends FOR SELECT TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

-- 3. Function + trigger to email on notification insert via pg_net
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.tg_notifications_send_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_key text;
BEGIN
  -- Read service role key from vault (stored by setup_email_infra)
  BEGIN
    SELECT decrypted_secret INTO v_key
      FROM vault.decrypted_secrets
      WHERE name = 'email_queue_service_role_key'
      LIMIT 1;
  EXCEPTION WHEN others THEN
    v_key := NULL;
  END;

  IF v_key IS NULL THEN
    RETURN NEW;
  END IF;

  v_url := 'https://wfuadudqtcmpdbgtgazh.supabase.co/functions/v1/dispatch-notification-email';

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object('notification_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_send_email ON public.notifications;
CREATE TRIGGER notifications_send_email
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.tg_notifications_send_email();

-- 4. Cron job for lesson reminders, every 10 min
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE
  v_key text;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1;
  EXCEPTION WHEN others THEN v_key := NULL; END;

  IF v_key IS NOT NULL THEN
    PERFORM cron.unschedule('dispatch-lesson-reminders');
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
DECLARE
  v_key text;
BEGIN
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1;
  IF v_key IS NOT NULL THEN
    PERFORM cron.schedule(
      'dispatch-lesson-reminders',
      '*/10 * * * *',
      format($cron$
        select net.http_post(
          url := 'https://wfuadudqtcmpdbgtgazh.supabase.co/functions/v1/dispatch-lesson-reminders',
          headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s'),
          body := '{}'::jsonb
        );
      $cron$, v_key)
    );
  END IF;
END $$;
