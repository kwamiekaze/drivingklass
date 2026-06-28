
ALTER TABLE public.report_cards
  ADD COLUMN IF NOT EXISTS student_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS guardian_email_sent_at timestamptz;

CREATE OR REPLACE FUNCTION public.on_report_card_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_should_notify boolean := false;
BEGIN
  IF NEW.report_card_status != 'completed' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_should_notify := (NEW.student_email_sent_at IS NULL);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.report_card_status IS DISTINCT FROM 'completed'
       AND NEW.student_email_sent_at IS NULL THEN
      v_should_notify := true;
    END IF;
    IF NEW.submitted_at IS NULL THEN
      NEW.submitted_at := now();
    END IF;
  END IF;

  UPDATE public.sessions
  SET completed = true,
      status = 'completed',
      completed_at = now(),
      completed_by = NEW.instructor_id
  WHERE id = NEW.session_id
    AND status != 'completed';

  PERFORM public.apply_session_hour_deduction(NEW.session_id);

  IF v_should_notify THEN
    INSERT INTO public.notifications (user_id, title, message, type, report_card_id)
    VALUES (
      NEW.student_id,
      'New Report Card',
      'Your instructor has submitted a report card for your lesson.',
      'report_card_posted',
      NEW.id
    );
    NEW.student_email_sent_at := now();
  END IF;

  RETURN NEW;
END;
$function$;
