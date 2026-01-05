-- Create RPC to fetch report card details with authorization checks
CREATE OR REPLACE FUNCTION public.get_report_card_details(p_report_card_id uuid)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  session_id uuid,
  student_id uuid,
  instructor_id uuid,
  lesson_audio_url text,
  transcription_summary text,
  message_to_student text,
  internal_message text,
  acceleration int,
  braking int,
  left_turns int,
  right_turns int,
  speed_maintenance int,
  lane_maintenance int,
  blind_spots int,
  signal_usage int,
  changing_lanes int,
  following_distance int,
  road_sign_awareness int,
  distractions int,
  general_parking int,
  reverse_parking int,
  parallel_parking int,
  straight_line_backing int,
  turn_about int,
  merging int,
  interstate int,
  overall int,
  session_starts_at timestamptz,
  session_ends_at timestamptz,
  session_status text,
  student_name text,
  instructor_name text,
  student_email text,
  instructor_email text,
  can_see_internal boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rc.id,
    rc.created_at,
    rc.session_id,
    rc.student_id,
    rc.instructor_id,
    rc.lesson_audio_url,
    rc.transcription_summary,
    rc.message_to_student,
    -- Only return internal_message if caller is staff/admin
    CASE WHEN is_staff_or_admin(auth.uid()) THEN rc.internal_message ELSE NULL END as internal_message,
    rc.acceleration,
    rc.braking,
    rc.left_turns,
    rc.right_turns,
    rc.speed_maintenance,
    rc.lane_maintenance,
    rc.blind_spots,
    rc.signal_usage,
    rc.changing_lanes,
    rc.following_distance,
    rc.road_sign_awareness,
    rc.distractions,
    rc.general_parking,
    rc.reverse_parking,
    rc.parallel_parking,
    rc.straight_line_backing,
    rc.turn_about,
    rc.merging,
    rc.interstate,
    rc.overall,
    s.starts_at as session_starts_at,
    s.ends_at as session_ends_at,
    s.status as session_status,
    COALESCE(NULLIF(TRIM(COALESCE(sp.first_name, '') || ' ' || COALESCE(sp.last_name, '')), ''), sp.full_name, sp.email, 'Student') as student_name,
    COALESCE(NULLIF(TRIM(COALESCE(ip.first_name, '') || ' ' || COALESCE(ip.last_name, '')), ''), ip.full_name, ip.email, 'Instructor') as instructor_name,
    sp.email as student_email,
    ip.email as instructor_email,
    is_staff_or_admin(auth.uid()) as can_see_internal
  FROM public.report_cards rc
  LEFT JOIN public.sessions s ON s.id = rc.session_id
  LEFT JOIN public.profiles sp ON sp.id = rc.student_id
  LEFT JOIN public.profiles ip ON ip.id = rc.instructor_id
  WHERE rc.id = p_report_card_id
    AND (
      -- Authorization: must be student, instructor, or staff/admin
      rc.student_id = auth.uid()
      OR rc.instructor_id = auth.uid()
      OR is_staff_or_admin(auth.uid())
    );
$$;