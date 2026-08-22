-- 1. Consent tracking on leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS email_consent_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS email_consent_source text,
  ADD COLUMN IF NOT EXISTS email_consent_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_consent_updated_by uuid;

DO $$ BEGIN
  ALTER TABLE public.leads ADD CONSTRAINT leads_email_consent_status_check
    CHECK (email_consent_status IN ('unknown','granted','revoked'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_leads_email_consent_status ON public.leads(email_consent_status);

-- 2. Marketing settings singleton
CREATE TABLE IF NOT EXISTS public.marketing_settings (
  id integer PRIMARY KEY DEFAULT 1,
  from_email text NOT NULL DEFAULT 'connect@mail.drivingklass.com',
  from_name text NOT NULL DEFAULT 'Driving Klass',
  reply_to text NOT NULL DEFAULT 'connect@drivingklass.com',
  marketing_domain text NOT NULL DEFAULT 'mail.drivingklass.com',
  domain_verified boolean NOT NULL DEFAULT false,
  business_name text,
  business_address text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_settings_singleton CHECK (id = 1)
);

GRANT SELECT, INSERT, UPDATE ON public.marketing_settings TO authenticated;
GRANT ALL ON public.marketing_settings TO service_role;
ALTER TABLE public.marketing_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage marketing settings" ON public.marketing_settings;
CREATE POLICY "Admins manage marketing settings" ON public.marketing_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.marketing_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 3. Campaigns
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  name text,
  subject text NOT NULL,
  body_text text NOT NULL,
  body_html text,
  audience text NOT NULL DEFAULT 'both',
  filter_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  from_email text NOT NULL,
  from_name text NOT NULL,
  reply_to text NOT NULL,
  provider text NOT NULL DEFAULT 'resend',
  provider_broadcast_id text,
  status text NOT NULL DEFAULT 'draft',
  total_recipients integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  idempotency_key text UNIQUE,
  is_test boolean NOT NULL DEFAULT false,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid,
  last_error text,
  CONSTRAINT email_campaigns_audience_check CHECK (audience IN ('student','guardian','both')),
  CONSTRAINT email_campaigns_status_check CHECK (status IN ('draft','confirmed','sending','paused','cancelled','completed','failed'))
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at ON public.email_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON public.email_campaigns(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaigns TO authenticated;
GRANT ALL ON public.email_campaigns TO service_role;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage campaigns" ON public.email_campaigns;
CREATE POLICY "Admins manage campaigns" ON public.email_campaigns
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Campaign recipients
CREATE TABLE IF NOT EXISTS public.email_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  campaign_id uuid NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  email text NOT NULL,
  recipient_type text NOT NULL,
  display_name text,
  status text NOT NULL DEFAULT 'pending',
  skip_reason text,
  error_message text,
  provider_message_id text,
  attempts integer NOT NULL DEFAULT 0,
  sent_at timestamptz,
  CONSTRAINT email_campaign_recipients_type_check CHECK (recipient_type IN ('student','guardian','test')),
  CONSTRAINT email_campaign_recipients_status_check CHECK (status IN ('pending','sending','sent','failed','skipped','cancelled')),
  CONSTRAINT email_campaign_recipients_unique UNIQUE (campaign_id, email)
);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON public.email_campaign_recipients(campaign_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaign_recipients TO authenticated;
GRANT ALL ON public.email_campaign_recipients TO service_role;
ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage campaign recipients" ON public.email_campaign_recipients;
CREATE POLICY "Admins manage campaign recipients" ON public.email_campaign_recipients
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. updated_at triggers
DROP TRIGGER IF EXISTS trg_email_campaigns_updated_at ON public.email_campaigns;
CREATE TRIGGER trg_email_campaigns_updated_at BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_campaign_recipients_updated_at ON public.email_campaign_recipients;
CREATE TRIGGER trg_campaign_recipients_updated_at BEFORE UPDATE ON public.email_campaign_recipients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_marketing_settings_updated_at ON public.marketing_settings;
CREATE TRIGGER trg_marketing_settings_updated_at BEFORE UPDATE ON public.marketing_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Admin bulk consent update (audited)
CREATE OR REPLACE FUNCTION public.admin_set_lead_consent(
  p_lead_ids uuid[],
  p_status text,
  p_source text DEFAULT 'admin_bulk_action'
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_status NOT IN ('unknown','granted','revoked') THEN
    RAISE EXCEPTION 'Invalid consent status';
  END IF;

  UPDATE public.leads
     SET email_consent_status = p_status,
         email_consent_source = p_source,
         email_consent_updated_at = now(),
         email_consent_updated_by = auth.uid()
   WHERE id = ANY(p_lead_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.lead_activity (lead_id, actor_user_id, action, details)
  SELECT unnest(p_lead_ids), auth.uid(), 'consent_updated',
         jsonb_build_object('status', p_status, 'source', p_source);

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_lead_consent(uuid[], text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_lead_consent(uuid[], text, text) TO authenticated;