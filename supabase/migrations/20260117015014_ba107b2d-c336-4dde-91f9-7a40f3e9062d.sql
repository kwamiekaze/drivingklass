-- A) Add missing address columns to sessions table
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS pickup_address TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS dropoff_address TEXT;

-- Backfill existing sessions from student profiles
-- Sessions that have NULL addresses will get the student's profile addresses
UPDATE public.sessions s
SET 
  pickup_address = COALESCE(s.pickup_address, p.pickup_address),
  dropoff_address = COALESCE(s.dropoff_address, p.dropoff_address)
FROM public.profiles p
WHERE s.student_id = p.id
  AND (s.pickup_address IS NULL OR s.dropoff_address IS NULL);

-- Drop and recreate the get_session_details function to ensure it works
DROP FUNCTION IF EXISTS public.get_session_details(uuid);

CREATE OR REPLACE FUNCTION public.get_session_details(p_session_id uuid)
RETURNS TABLE(
  session_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
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
  completed_at timestamptz,
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
    -- Only show phone numbers to staff/admin or the assigned instructor
    CASE WHEN v_is_staff_or_admin OR v_is_instructor 
      THEN sp.phone 
      ELSE NULL 
    END as student_phone,
    CASE WHEN v_is_staff_or_admin OR v_is_instructor 
      THEN sp.guardian_phone 
      ELSE NULL 
    END as guardian_phone,
    sess.note_for_student,
    sess.note_for_instructor,
    sess.cancellation_reason,
    sess.report_card_id,
    sess.completed,
    sess.completed_at,
    -- Return session addresses, with fallback to student profile addresses
    COALESCE(sess.pickup_address, sp.pickup_address) as pickup_address,
    COALESCE(sess.dropoff_address, sp.dropoff_address) as dropoff_address
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
$$;