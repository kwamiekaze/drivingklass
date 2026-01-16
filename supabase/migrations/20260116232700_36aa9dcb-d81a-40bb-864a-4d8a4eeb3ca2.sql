
-- Drop and recreate get_session_details RPC to include student phone and guardian phone
DROP FUNCTION IF EXISTS public.get_session_details(uuid);

CREATE FUNCTION public.get_session_details(p_session_id uuid)
RETURNS TABLE(
  session_id uuid,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  duration_minutes integer,
  status text,
  student_id uuid,
  instructor_id uuid,
  student_name text,
  instructor_name text,
  student_email text,
  instructor_email text,
  student_phone text,
  guardian_phone text,
  note_for_student text,
  note_for_instructor text,
  cancellation_reason text,
  report_card_id uuid,
  completed boolean,
  completed_at timestamp with time zone,
  pickup_address text,
  dropoff_address text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_is_staff_or_admin boolean;
  v_is_instructor boolean;
BEGIN
  -- Check if caller is staff or admin
  v_is_staff_or_admin := is_staff_or_admin(v_caller_id);
  
  -- Check if caller is the instructor for this session
  SELECT EXISTS(
    SELECT 1 FROM sessions s 
    WHERE s.id = p_session_id AND s.instructor_id = v_caller_id
  ) INTO v_is_instructor;

  RETURN QUERY
  SELECT
    s.id as session_id,
    s.starts_at,
    s.ends_at,
    s.duration_minutes,
    s.status,
    s.student_id,
    s.instructor_id,
    COALESCE(sp.full_name, CONCAT(sp.first_name, ' ', sp.last_name), sp.email, 'Student') as student_name,
    COALESCE(ip.full_name, CONCAT(ip.first_name, ' ', ip.last_name), ip.email, 'Instructor') as instructor_name,
    sp.email as student_email,
    ip.email as instructor_email,
    -- Only show phone numbers to staff/admin or the assigned instructor
    CASE WHEN v_is_staff_or_admin OR v_is_instructor 
      THEN sp.phone 
      ELSE NULL 
    END as student_phone,
    CASE WHEN v_is_staff_or_admin OR v_is_instructor 
      THEN sp.guardian_phone 
      ELSE NULL 
    END as guardian_phone,
    s.note_for_student,
    s.note_for_instructor,
    s.cancellation_reason,
    s.report_card_id,
    s.completed,
    s.completed_at,
    s.pickup_address,
    s.dropoff_address
  FROM sessions s
  JOIN profiles sp ON s.student_id = sp.id
  JOIN profiles ip ON s.instructor_id = ip.id
  WHERE s.id = p_session_id
    AND (
      s.student_id = v_caller_id
      OR s.instructor_id = v_caller_id
      OR v_is_staff_or_admin
    );
END;
$$;
