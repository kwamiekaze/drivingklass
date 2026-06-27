
ALTER TABLE public.report_cards
  ADD COLUMN IF NOT EXISTS first_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_viewed_via text,
  ADD COLUMN IF NOT EXISTS last_viewed_via text;

DROP FUNCTION IF EXISTS public.get_report_card_details(uuid);

CREATE FUNCTION public.get_report_card_details(p_report_card_id uuid)
 RETURNS TABLE(id uuid, created_at timestamp with time zone, session_id uuid, student_id uuid, instructor_id uuid, lesson_audio_url text, audio_path text, audio_mime text, audio_size_bytes bigint, audio_original_name text, audio_uploaded_at timestamp with time zone, transcription_summary text, message_to_student text, internal_message text, acceleration integer, braking integer, left_turns integer, right_turns integer, speed_maintenance integer, lane_maintenance integer, blind_spots integer, signal_usage integer, changing_lanes integer, following_distance integer, road_sign_awareness integer, distractions integer, general_parking integer, reverse_parking integer, parallel_parking integer, straight_line_backing integer, turn_about integer, merging integer, interstate integer, overall integer, session_starts_at timestamp with time zone, session_ends_at timestamp with time zone, session_status text, student_name text, instructor_name text, student_email text, instructor_email text, can_see_internal boolean, first_viewed_at timestamp with time zone, last_viewed_at timestamp with time zone, view_count integer, first_viewed_via text, last_viewed_via text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    rc.id, rc.created_at, rc.session_id, rc.student_id, rc.instructor_id,
    rc.lesson_audio_url, rc.audio_path, rc.audio_mime, rc.audio_size_bytes,
    rc.audio_original_name, rc.audio_uploaded_at, rc.transcription_summary,
    rc.message_to_student,
    CASE WHEN is_staff_or_admin(auth.uid()) THEN rc.internal_message ELSE NULL END as internal_message,
    rc.acceleration, rc.braking, rc.left_turns, rc.right_turns,
    rc.speed_maintenance, rc.lane_maintenance, rc.blind_spots, rc.signal_usage,
    rc.changing_lanes, rc.following_distance, rc.road_sign_awareness, rc.distractions,
    rc.general_parking, rc.reverse_parking, rc.parallel_parking, rc.straight_line_backing,
    rc.turn_about, rc.merging, rc.interstate, rc.overall,
    s.starts_at as session_starts_at, s.ends_at as session_ends_at, s.status as session_status,
    COALESCE(NULLIF(TRIM(COALESCE(sp.first_name, '') || ' ' || COALESCE(sp.last_name, '')), ''), sp.full_name, sp.email, 'Student') as student_name,
    COALESCE(NULLIF(TRIM(COALESCE(ip.first_name, '') || ' ' || COALESCE(ip.last_name, '')), ''), ip.full_name, ip.email, 'Instructor') as instructor_name,
    sp.email as student_email, ip.email as instructor_email,
    is_staff_or_admin(auth.uid()) as can_see_internal,
    rc.first_viewed_at, rc.last_viewed_at, rc.view_count, rc.first_viewed_via, rc.last_viewed_via
  FROM public.report_cards rc
  LEFT JOIN public.sessions s ON s.id = rc.session_id
  LEFT JOIN public.profiles sp ON sp.id = rc.student_id
  LEFT JOIN public.profiles ip ON ip.id = rc.instructor_id
  WHERE rc.id = p_report_card_id
    AND (
      rc.student_id = auth.uid()
      OR rc.instructor_id = auth.uid()
      OR is_staff_or_admin(auth.uid())
    );
$function$;

CREATE OR REPLACE FUNCTION public.mark_report_card_viewed(p_report_card_id uuid, p_via text DEFAULT 'student')
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rc record;
  v_uid uuid := auth.uid();
  v_role text;
  v_is_service boolean := false;
BEGIN
  BEGIN
    v_role := current_setting('request.jwt.claim.role', true);
  EXCEPTION WHEN others THEN
    v_role := NULL;
  END;
  IF v_role = 'service_role' THEN v_is_service := true; END IF;

  SELECT id, student_id INTO v_rc FROM public.report_cards WHERE id = p_report_card_id;
  IF v_rc.id IS NULL THEN RETURN; END IF;

  -- Only the student who owns the report (or service role from an edge fn) can mark a view
  IF NOT v_is_service AND (v_uid IS NULL OR v_uid <> v_rc.student_id) THEN
    RETURN;
  END IF;

  UPDATE public.report_cards
  SET first_viewed_at = COALESCE(first_viewed_at, now()),
      last_viewed_at = now(),
      view_count = COALESCE(view_count, 0) + 1,
      first_viewed_via = COALESCE(first_viewed_via, p_via),
      last_viewed_via = p_via
  WHERE id = p_report_card_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.mark_report_card_viewed(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.tg_report_card_first_view_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_student_name text;
  v_when text;
  v_via_label text;
BEGIN
  IF NEW.first_viewed_at IS NOT NULL AND OLD.first_viewed_at IS NULL THEN
    SELECT COALESCE(NULLIF(TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')), ''), full_name, email, 'Student')
      INTO v_student_name
      FROM public.profiles WHERE id = NEW.student_id;

    v_when := to_char(NEW.first_viewed_at AT TIME ZONE 'America/New_York', 'Mon DD, YYYY HH12:MI AM');
    v_via_label := CASE WHEN NEW.first_viewed_via = 'public' THEN 'via shared access code' ELSE 'by the student' END;

    INSERT INTO public.notifications (user_id, title, message, type, severity, report_card_id, link, dedupe_key)
    VALUES (
      NEW.instructor_id,
      'Report Card Viewed',
      format('%s viewed their report card %s on %s.', v_student_name, v_via_label, v_when),
      'report_card_viewed', 'info', NEW.id,
      '/report-cards/' || NEW.id::text,
      'rc_first_view:' || NEW.id::text
    )
    ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS report_card_first_view_notify ON public.report_cards;
CREATE TRIGGER report_card_first_view_notify
  AFTER UPDATE OF first_viewed_at ON public.report_cards
  FOR EACH ROW EXECUTE FUNCTION public.tg_report_card_first_view_notify();
