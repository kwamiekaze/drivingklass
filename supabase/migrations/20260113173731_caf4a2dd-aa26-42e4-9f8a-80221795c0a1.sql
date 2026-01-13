-- Drop existing functions first (return type is changing)
DROP FUNCTION IF EXISTS public.get_session_details(uuid);
DROP FUNCTION IF EXISTS public.get_my_sessions();

-- Recreate get_session_details with pickup/dropoff addresses
CREATE FUNCTION public.get_session_details(p_session_id uuid)
 RETURNS TABLE(session_id uuid, starts_at timestamp with time zone, ends_at timestamp with time zone, duration_minutes integer, status text, student_id uuid, instructor_id uuid, student_name text, instructor_name text, student_email text, instructor_email text, note_for_student text, note_for_instructor text, cancellation_reason text, report_card_id uuid, completed boolean, completed_at timestamp with time zone, pickup_address text, dropoff_address text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    s.completed_at,
    sp.pickup_address as pickup_address,
    sp.dropoff_address as dropoff_address
  FROM public.sessions s
  LEFT JOIN public.profiles sp ON sp.id = s.student_id
  LEFT JOIN public.profiles ip ON ip.id = s.instructor_id
  WHERE s.id = p_session_id
    AND (
      s.student_id = auth.uid()
      OR s.instructor_id = auth.uid()
      OR public.is_staff_or_admin(auth.uid())
    );
$function$;

-- Recreate get_my_sessions with pickup/dropoff addresses
CREATE FUNCTION public.get_my_sessions()
 RETURNS TABLE(session_id uuid, starts_at timestamp with time zone, ends_at timestamp with time zone, duration_minutes integer, status text, student_id uuid, instructor_id uuid, student_name text, instructor_name text, student_email text, instructor_email text, note_for_student text, note_for_instructor text, cancellation_reason text, report_card_id uuid, completed boolean, completed_at timestamp with time zone, pickup_address text, dropoff_address text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    s.completed_at,
    sp.pickup_address as pickup_address,
    sp.dropoff_address as dropoff_address
  FROM public.sessions s
  LEFT JOIN public.profiles sp ON sp.id = s.student_id
  LEFT JOIN public.profiles ip ON ip.id = s.instructor_id
  WHERE s.student_id = auth.uid()
     OR s.instructor_id = auth.uid()
     OR public.is_staff_or_admin(auth.uid())
  ORDER BY s.starts_at DESC;
$function$;