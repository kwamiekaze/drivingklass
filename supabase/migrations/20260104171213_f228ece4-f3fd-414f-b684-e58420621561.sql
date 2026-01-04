-- Add session notes columns (if not exist)
ALTER TABLE public.sessions 
  ADD COLUMN IF NOT EXISTS note_for_student text,
  ADD COLUMN IF NOT EXISTS note_for_instructor text;

-- Create cancel_session RPC with proper role checks
CREATE OR REPLACE FUNCTION public.cancel_session(
  _session_id uuid,
  _reason text
)
RETURNS sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _session public.sessions;
  _user_role text;
  _is_staff_admin boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _reason IS NULL OR trim(_reason) = '' THEN
    RAISE EXCEPTION 'Cancellation reason is required';
  END IF;

  -- Get user role
  SELECT role::text INTO _user_role FROM public.user_roles WHERE user_id = _uid LIMIT 1;
  _is_staff_admin := _user_role IN ('staff', 'admin');

  -- Get the session
  SELECT * INTO _session FROM public.sessions WHERE id = _session_id;
  
  IF _session.id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Check permissions
  IF NOT _is_staff_admin THEN
    -- Students can only cancel their own sessions
    IF _user_role = 'student' AND _session.student_id != _uid THEN
      RAISE EXCEPTION 'Not authorized to cancel this session';
    END IF;
    -- Instructors can only cancel their own sessions
    IF _user_role = 'instructor' AND _session.instructor_id != _uid THEN
      RAISE EXCEPTION 'Not authorized to cancel this session';
    END IF;
    -- Cannot cancel completed sessions unless admin/staff
    IF _session.status = 'completed' THEN
      RAISE EXCEPTION 'Cannot cancel a completed session';
    END IF;
  END IF;

  -- Cannot cancel already cancelled sessions
  IF _session.status = 'cancelled' THEN
    RAISE EXCEPTION 'Session is already cancelled';
  END IF;

  -- Update the session
  UPDATE public.sessions
  SET 
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = _uid,
    cancelled_by_role = _user_role,
    cancellation_reason = trim(_reason)
  WHERE id = _session_id
  RETURNING * INTO _session;

  -- Create notification for the other party
  IF _user_role = 'student' OR (_is_staff_admin AND _session.student_id = _uid) THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (_session.instructor_id, 'Session Cancelled', 
      'A session has been cancelled. Reason: ' || trim(_reason), 'session_cancelled');
  END IF;
  
  IF _user_role = 'instructor' OR (_is_staff_admin AND _session.instructor_id = _uid) THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (_session.student_id, 'Session Cancelled', 
      'Your session has been cancelled. Reason: ' || trim(_reason), 'session_cancelled');
  END IF;

  -- For admin/staff cancelling someone else's session, notify both
  IF _is_staff_admin AND _session.student_id != _uid AND _session.instructor_id != _uid THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES 
      (_session.student_id, 'Session Cancelled', 'Your session has been cancelled by staff. Reason: ' || trim(_reason), 'session_cancelled'),
      (_session.instructor_id, 'Session Cancelled', 'A session has been cancelled by staff. Reason: ' || trim(_reason), 'session_cancelled');
  END IF;

  RETURN _session;
END;
$$;

-- Create complete_session RPC
CREATE OR REPLACE FUNCTION public.complete_session(
  _session_id uuid,
  _via text DEFAULT 'manual'
)
RETURNS sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _session public.sessions;
  _user_role text;
  _is_staff_admin boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user role
  SELECT role::text INTO _user_role FROM public.user_roles WHERE user_id = _uid LIMIT 1;
  _is_staff_admin := _user_role IN ('staff', 'admin');

  -- Get the session
  SELECT * INTO _session FROM public.sessions WHERE id = _session_id;
  
  IF _session.id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Students cannot complete sessions
  IF _user_role = 'student' THEN
    RAISE EXCEPTION 'Students cannot complete sessions';
  END IF;

  -- Check permissions
  IF NOT _is_staff_admin THEN
    -- Instructors can only complete their own sessions
    IF _user_role = 'instructor' AND _session.instructor_id != _uid THEN
      RAISE EXCEPTION 'Not authorized to complete this session';
    END IF;
  END IF;

  -- Cannot complete cancelled sessions
  IF _session.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot complete a cancelled session';
  END IF;

  -- Cannot complete already completed sessions
  IF _session.status = 'completed' THEN
    RAISE EXCEPTION 'Session is already completed';
  END IF;

  -- Update the session
  UPDATE public.sessions
  SET 
    status = 'completed',
    completed = true,
    completed_at = now(),
    completed_by = _uid
  WHERE id = _session_id
  RETURNING * INTO _session;

  RETURN _session;
END;
$$;

-- Create update_session_notes RPC for admin/staff only
CREATE OR REPLACE FUNCTION public.update_session_notes(
  _session_id uuid,
  _note_for_student text DEFAULT NULL,
  _note_for_instructor text DEFAULT NULL
)
RETURNS sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _session public.sessions;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Only staff/admin can update session notes
  IF NOT public.is_staff_or_admin(_uid) THEN
    RAISE EXCEPTION 'Not authorized to update session notes';
  END IF;

  -- Get the session
  SELECT * INTO _session FROM public.sessions WHERE id = _session_id;
  
  IF _session.id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Update the session notes
  UPDATE public.sessions
  SET 
    note_for_student = COALESCE(_note_for_student, note_for_student),
    note_for_instructor = COALESCE(_note_for_instructor, note_for_instructor)
  WHERE id = _session_id
  RETURNING * INTO _session;

  RETURN _session;
END;
$$;