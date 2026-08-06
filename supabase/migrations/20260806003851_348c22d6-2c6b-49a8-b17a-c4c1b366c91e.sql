-- 1. Additive columns
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS partial_reason text,
  ADD COLUMN IF NOT EXISTS actual_minutes integer;

-- 2. Allow the new status
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_status_check
  CHECK (status = ANY (ARRAY['scheduled'::text, 'cancelled'::text, 'completed'::text, 'pending'::text, 'partially_completed'::text]));

-- 3. Hours completed accumulation (idempotent via hours_counted)
CREATE OR REPLACE FUNCTION public.accumulate_student_hours_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_hours NUMERIC;
  v_minutes INTEGER;
BEGIN
  IF NEW.status IN ('completed', 'partially_completed')
     AND COALESCE(NEW.hours_counted, false) = false
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.student_id IS NOT NULL THEN
    v_minutes := CASE
      WHEN NEW.status = 'partially_completed' THEN COALESCE(NEW.actual_minutes, NEW.duration_minutes, 0)
      ELSE COALESCE(NEW.duration_minutes, 0)
    END;
    IF v_minutes > 0 THEN
      v_hours := ROUND(v_minutes::numeric / 60.0, 2);
      UPDATE public.profiles
         SET hours_completed = COALESCE(hours_completed, 0) + v_hours,
             updated_at = now()
       WHERE id = NEW.student_id;
      NEW.hours_counted := true;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. Remaining-hours computation counts partial sessions at actual minutes
CREATE OR REPLACE FUNCTION public.compute_completed_hours(p_student_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(
    CASE
      WHEN s.status = 'partially_completed'
        THEN COALESCE(s.actual_minutes, s.duration_minutes)
      ELSE s.duration_minutes
    END / 60.0
  ), 0)::numeric
  FROM public.sessions s
  LEFT JOIN public.report_cards rc ON rc.session_id = s.id
  WHERE s.student_id = p_student_id
    AND s.status != 'cancelled'
    AND (
      s.status IN ('completed', 'partially_completed')
      OR rc.session_id IS NOT NULL
    );
$function$;

-- 5. Notifications for partial completion
CREATE OR REPLACE FUNCTION public.notify_session_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_student_name text;
  v_instructor_name text;
  v_session_date text;
  v_session_time text;
  v_event_type text;
  v_student_title text;
  v_student_message text;
  v_instructor_title text;
  v_instructor_message text;
  v_dedupe_student text;
  v_dedupe_instructor text;
  v_suppress_student boolean;
BEGIN
  v_suppress_student := COALESCE(NEW.suppress_student_notification, false);

  SELECT COALESCE(full_name, first_name || ' ' || last_name, email, 'Student') INTO v_student_name
  FROM profiles WHERE id = NEW.student_id;

  SELECT COALESCE(full_name, first_name || ' ' || last_name, email, 'Instructor') INTO v_instructor_name
  FROM profiles WHERE id = NEW.instructor_id;

  v_session_date := to_char(NEW.starts_at AT TIME ZONE 'America/New_York', 'Mon DD, YYYY');
  v_session_time := to_char(NEW.starts_at AT TIME ZONE 'America/New_York', 'HH12:MI AM');

  IF TG_OP = 'INSERT' THEN
    v_event_type := 'session_created';
    v_student_title := 'New Session Scheduled';
    v_student_message := format('You have a session scheduled on %s at %s with %s.', v_session_date, v_session_time, v_instructor_name);
    v_instructor_title := 'New Session Assigned';
    v_instructor_message := format('You have been assigned a session on %s at %s with %s.', v_session_date, v_session_time, v_student_name);

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
      v_event_type := 'session_cancelled';
      v_student_title := 'Session Cancelled';
      v_student_message := format('Your session on %s at %s has been cancelled.%s',
        v_session_date, v_session_time,
        CASE WHEN NEW.cancellation_reason IS NOT NULL THEN ' Reason: ' || NEW.cancellation_reason ELSE '' END);
      v_instructor_title := 'Session Cancelled';
      v_instructor_message := format('The session on %s at %s with %s has been cancelled.%s',
        v_session_date, v_session_time, v_student_name,
        CASE WHEN NEW.cancellation_reason IS NOT NULL THEN ' Reason: ' || NEW.cancellation_reason ELSE '' END);

    ELSIF NEW.status = 'partially_completed' AND OLD.status IS DISTINCT FROM 'partially_completed' THEN
      v_event_type := 'session_partially_completed';
      v_student_title := 'Lesson Partially Completed';
      v_student_message := format('Your lesson on %s at %s was marked partially complete.%s',
        v_session_date, v_session_time,
        CASE WHEN NEW.partial_reason IS NOT NULL THEN ' Reason: ' || NEW.partial_reason ELSE '' END);
      v_instructor_title := 'Lesson Partially Completed';
      v_instructor_message := format('The lesson with %s on %s was marked partially complete.', v_student_name, v_session_date);

    ELSIF NEW.status = 'completed' AND OLD.status != 'completed' THEN
      v_event_type := 'session_completed';
      v_student_title := 'Session Completed';
      v_student_message := format('Your session on %s has been marked as completed.', v_session_date);
      v_instructor_title := 'Session Completed';
      v_instructor_message := format('Session with %s on %s has been marked as completed.', v_student_name, v_session_date);

    ELSIF (NEW.starts_at != OLD.starts_at OR NEW.ends_at != OLD.ends_at) AND NEW.status = 'scheduled' THEN
      v_event_type := 'session_rescheduled';
      v_student_title := 'Session Rescheduled';
      v_student_message := format('Your session has been rescheduled to %s at %s with %s.', v_session_date, v_session_time, v_instructor_name);
      v_instructor_title := 'Session Rescheduled';
      v_instructor_message := format('Session with %s has been rescheduled to %s at %s.', v_student_name, v_session_date, v_session_time);

    ELSIF (NEW.student_id != OLD.student_id OR NEW.instructor_id != OLD.instructor_id) AND NEW.status = 'scheduled' THEN
      v_event_type := 'session_assigned';
      v_student_title := 'Session Assigned';
      v_student_message := format('You have been assigned to a session on %s at %s with %s.', v_session_date, v_session_time, v_instructor_name);
      v_instructor_title := 'Student Assigned';
      v_instructor_message := format('%s has been assigned to your session on %s at %s.', v_student_name, v_session_date, v_session_time);
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  v_dedupe_student := NEW.id || ':' || v_event_type || ':' || NEW.student_id || ':' || date_trunc('minute', NOW());
  v_dedupe_instructor := NEW.id || ':' || v_event_type || ':' || NEW.instructor_id || ':' || date_trunc('minute', NOW());

  IF NOT v_suppress_student THEN
    INSERT INTO notifications (user_id, title, message, type, severity, session_id, link, dedupe_key)
    VALUES (
      NEW.student_id, v_student_title, v_student_message, v_event_type,
      CASE WHEN v_event_type = 'session_cancelled' THEN 'warning'
           WHEN v_event_type = 'session_partially_completed' THEN 'warning'
           ELSE 'info' END,
      NEW.id, '/student', v_dedupe_student
    )
    ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  END IF;

  INSERT INTO notifications (user_id, title, message, type, severity, session_id, link, dedupe_key)
  VALUES (
    NEW.instructor_id, v_instructor_title, v_instructor_message, v_event_type,
    CASE WHEN v_event_type = 'session_cancelled' THEN 'warning' ELSE 'info' END,
    NEW.id, '/instructor', v_dedupe_instructor
  )
  ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;

  -- Notify admins/staff in-app, mirroring the completed flow
  IF v_event_type = 'session_partially_completed' THEN
    INSERT INTO notifications (user_id, title, message, type, severity, session_id, link, dedupe_key)
    SELECT ur.user_id,
           'Lesson Partially Completed',
           format('%s''s lesson with %s on %s was marked partially complete.%s',
             v_student_name, v_instructor_name, v_session_date,
             CASE WHEN NEW.partial_reason IS NOT NULL THEN ' Reason: ' || NEW.partial_reason ELSE '' END),
           v_event_type, 'warning', NEW.id, '/admin/schedule',
           NEW.id || ':' || v_event_type || ':' || ur.user_id || ':' || date_trunc('minute', NOW())
    FROM public.user_roles ur
    WHERE ur.role IN ('admin', 'staff')
    ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- 6. RPC to mark a session partially complete (instructor of record, staff, or admin)
CREATE OR REPLACE FUNCTION public.partially_complete_session(
  _session_id uuid,
  _reason text,
  _actual_minutes integer DEFAULT NULL
)
RETURNS sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _session public.sessions;
  _user_role text;
  _is_staff_admin boolean;
  _minutes integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _reason IS NULL OR btrim(_reason) = '' THEN
    RAISE EXCEPTION 'A reason is required to mark a session partially complete';
  END IF;

  SELECT role::text INTO _user_role FROM public.user_roles WHERE user_id = _uid LIMIT 1;
  _is_staff_admin := _user_role IN ('staff', 'admin');

  SELECT * INTO _session FROM public.sessions WHERE id = _session_id;
  IF _session.id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF _user_role = 'student' THEN
    RAISE EXCEPTION 'Students cannot complete sessions';
  END IF;

  IF NOT _is_staff_admin AND NOT (_user_role = 'instructor' AND _session.instructor_id = _uid) THEN
    RAISE EXCEPTION 'Not authorized to update this session';
  END IF;

  IF _session.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot complete a cancelled session';
  END IF;

  IF _session.status IN ('completed', 'partially_completed') THEN
    RAISE EXCEPTION 'Session is already completed';
  END IF;

  _minutes := COALESCE(NULLIF(_actual_minutes, 0), _session.duration_minutes);
  IF _minutes < 0 THEN
    _minutes := 0;
  END IF;
  IF _session.duration_minutes IS NOT NULL AND _minutes > _session.duration_minutes THEN
    _minutes := _session.duration_minutes;
  END IF;

  UPDATE public.sessions
  SET status = 'partially_completed',
      completed = true,
      completed_at = now(),
      completed_by = _uid,
      partial_reason = btrim(_reason),
      actual_minutes = _minutes
  WHERE id = _session_id
  RETURNING * INTO _session;

  RETURN _session;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.partially_complete_session(uuid, text, integer) TO authenticated;

-- 7. Session details now expose the guardian name
DROP FUNCTION IF EXISTS public.get_session_details(uuid);
CREATE FUNCTION public.get_session_details(p_session_id uuid)
RETURNS TABLE(
  session_id uuid, starts_at timestamp with time zone, ends_at timestamp with time zone,
  duration_minutes integer, status text, student_id uuid, instructor_id uuid,
  student_name text, instructor_name text, student_email text, instructor_email text,
  student_phone text, guardian_phone text, guardian_name text,
  note_for_student text, note_for_instructor text, cancellation_reason text,
  report_card_id uuid, completed boolean, completed_at timestamp with time zone,
  pickup_address text, dropoff_address text,
  partial_reason text, actual_minutes integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_is_staff_or_admin boolean;
  v_is_instructor boolean;
BEGIN
  v_is_staff_or_admin := is_staff_or_admin(v_caller_id);

  SELECT EXISTS(
    SELECT 1 FROM sessions sess
    WHERE sess.id = p_session_id AND sess.instructor_id = v_caller_id
  ) INTO v_is_instructor;

  RETURN QUERY
  SELECT
    sess.id as session_id,
    sess.starts_at,
    sess.ends_at,
    sess.duration_minutes,
    sess.status,
    sess.student_id,
    sess.instructor_id,
    COALESCE(sp.full_name, CONCAT(sp.first_name, ' ', sp.last_name), sp.email, 'Student') as student_name,
    COALESCE(ip.full_name, CONCAT(ip.first_name, ' ', ip.last_name), ip.email, 'Instructor') as instructor_name,
    sp.email as student_email,
    ip.email as instructor_email,
    CASE WHEN v_is_staff_or_admin OR v_is_instructor THEN sp.phone ELSE NULL END as student_phone,
    CASE WHEN v_is_staff_or_admin OR v_is_instructor THEN sp.guardian_phone ELSE NULL END as guardian_phone,
    CASE WHEN v_is_staff_or_admin OR v_is_instructor THEN sp.guardian_name ELSE NULL END as guardian_name,
    sess.note_for_student,
    sess.note_for_instructor,
    sess.cancellation_reason,
    sess.report_card_id,
    sess.completed,
    sess.completed_at,
    COALESCE(sess.pickup_address, sp.pickup_address) as pickup_address,
    COALESCE(sess.dropoff_address, sp.dropoff_address) as dropoff_address,
    sess.partial_reason,
    sess.actual_minutes
  FROM sessions sess
  JOIN profiles sp ON sess.student_id = sp.id
  JOIN profiles ip ON sess.instructor_id = ip.id
  WHERE sess.id = p_session_id
    AND (
      sess.student_id = v_caller_id
      OR sess.instructor_id = v_caller_id
      OR v_is_staff_or_admin
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_session_details(uuid) TO authenticated;