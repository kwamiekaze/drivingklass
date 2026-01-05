-- Create the get_session_details RPC function for reliable session + names fetching
CREATE OR REPLACE FUNCTION public.get_session_details(p_session_id uuid)
RETURNS TABLE (
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
  note_for_student text,
  note_for_instructor text,
  cancellation_reason text,
  report_card_id uuid,
  completed boolean,
  completed_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id as session_id,
    s.starts_at,
    s.ends_at,
    s.duration_minutes,
    s.status,
    s.student_id,
    s.instructor_id,
    COALESCE(NULLIF(TRIM(COALESCE(sp.first_name, '') || ' ' || COALESCE(sp.last_name, '')), ''), sp.full_name, sp.email, 'Student') as student_name,
    COALESCE(NULLIF(TRIM(COALESCE(ip.first_name, '') || ' ' || COALESCE(ip.last_name, '')), ''), ip.full_name, ip.email, 'Instructor') as instructor_name,
    sp.email as student_email,
    ip.email as instructor_email,
    s.note_for_student,
    s.note_for_instructor,
    s.cancellation_reason,
    s.report_card_id,
    s.completed,
    s.completed_at
  FROM public.sessions s
  LEFT JOIN public.profiles sp ON sp.id = s.student_id
  LEFT JOIN public.profiles ip ON ip.id = s.instructor_id
  WHERE s.id = p_session_id
    AND (
      -- User must be the student, instructor, or staff/admin
      s.student_id = auth.uid()
      OR s.instructor_id = auth.uid()
      OR public.is_staff_or_admin(auth.uid())
    );
$$;

-- Grant execute to authenticated users only
REVOKE ALL ON FUNCTION public.get_session_details(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_session_details(uuid) TO authenticated;

-- Also create a function to get all session details for list views (with names included)
CREATE OR REPLACE FUNCTION public.get_my_sessions()
RETURNS TABLE (
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
  note_for_student text,
  note_for_instructor text,
  cancellation_reason text,
  report_card_id uuid,
  completed boolean,
  completed_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id as session_id,
    s.starts_at,
    s.ends_at,
    s.duration_minutes,
    s.status,
    s.student_id,
    s.instructor_id,
    COALESCE(NULLIF(TRIM(COALESCE(sp.first_name, '') || ' ' || COALESCE(sp.last_name, '')), ''), sp.full_name, sp.email, 'Student') as student_name,
    COALESCE(NULLIF(TRIM(COALESCE(ip.first_name, '') || ' ' || COALESCE(ip.last_name, '')), ''), ip.full_name, ip.email, 'Instructor') as instructor_name,
    sp.email as student_email,
    ip.email as instructor_email,
    s.note_for_student,
    s.note_for_instructor,
    s.cancellation_reason,
    s.report_card_id,
    s.completed,
    s.completed_at
  FROM public.sessions s
  LEFT JOIN public.profiles sp ON sp.id = s.student_id
  LEFT JOIN public.profiles ip ON ip.id = s.instructor_id
  WHERE s.student_id = auth.uid()
     OR s.instructor_id = auth.uid()
     OR public.is_staff_or_admin(auth.uid())
  ORDER BY s.starts_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_my_sessions() FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_sessions() TO authenticated;

-- Update the profiles RLS to allow reading counterpart profiles for shared sessions
DROP POLICY IF EXISTS "profiles_read_self_or_shared_session_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "Instructors can view assigned students" ON public.profiles;
DROP POLICY IF EXISTS "Students can view assigned instructor" ON public.profiles;

-- Create a comprehensive read policy for profiles
CREATE POLICY "profiles_read_access"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Can read own profile
  id = auth.uid()
  -- OR can read profiles of people in shared sessions
  OR EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE (s.student_id = auth.uid() AND s.instructor_id = profiles.id)
       OR (s.instructor_id = auth.uid() AND s.student_id = profiles.id)
  )
  -- OR can read assigned instructor/student relationships
  OR EXISTS (
    SELECT 1 FROM public.instructor_students ist
    WHERE (ist.student_id = auth.uid() AND ist.instructor_id = profiles.id)
       OR (ist.instructor_id = auth.uid() AND ist.student_id = profiles.id)
  )
  -- OR is staff/admin (can read all)
  OR public.is_staff_or_admin(auth.uid())
);