CREATE OR REPLACE FUNCTION public.tg_report_card_first_view_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_student_name text;
  v_instructor_first text;
  v_when text;
  v_via_suffix text;
  v_message text;
BEGIN
  IF NEW.first_viewed_at IS NOT NULL AND OLD.first_viewed_at IS NULL THEN
    SELECT COALESCE(NULLIF(TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')), ''), full_name, email, 'Student')
      INTO v_student_name
      FROM public.profiles WHERE id = NEW.student_id;

    SELECT NULLIF(TRIM(COALESCE(
             NULLIF(TRIM(first_name), ''),
             split_part(TRIM(regexp_replace(COALESCE(full_name,''), '^\s*(Mr|Mrs|Ms|Miss|Mx|Dr|Prof|Rev|Sir|Coach)\.?\s+', '', 'i')), ' ', 1)
           )), '')
      INTO v_instructor_first
      FROM public.profiles WHERE id = NEW.instructor_id;

    v_when := to_char(NEW.first_viewed_at AT TIME ZONE 'America/New_York', 'Mon DD, YYYY HH12:MI AM');
    v_via_suffix := CASE WHEN NEW.first_viewed_via = 'public' THEN ' via shared access code' ELSE '' END;

    IF v_instructor_first IS NOT NULL THEN
      v_message := format('%s viewed the report card submitted by %s on %s%s.', v_student_name, v_instructor_first, v_when, v_via_suffix);
    ELSE
      v_message := format('%s viewed their report card on %s%s.', v_student_name, v_when, v_via_suffix);
    END IF;

    -- Instructor + every admin/staff member, one notification each
    INSERT INTO public.notifications (user_id, title, message, type, severity, report_card_id, link, dedupe_key)
    SELECT r.user_id,
           'Report Card Viewed',
           v_message,
           'report_card_viewed', 'info', NEW.id,
           '/report-cards/' || NEW.id::text,
           'rc_first_view:' || NEW.id::text || ':' || r.user_id::text
    FROM (
      SELECT NEW.instructor_id AS user_id
      UNION
      SELECT ur.user_id FROM public.user_roles ur WHERE ur.role IN ('admin','staff')
    ) r
    WHERE r.user_id IS NOT NULL
    ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;