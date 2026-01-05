DROP FUNCTION IF EXISTS public.get_report_card_details(uuid);

CREATE OR REPLACE FUNCTION public.get_report_card_details(p_report_card_id uuid)
RETURNS TABLE(
  id uuid,
  created_at timestamptz,
  session_id uuid,
  student_id uuid,
  instructor_id uuid,
  lesson_audio_url text,
  audio_path text,
  audio_mime text,
  audio_size_bytes bigint,
  audio_original_name text,
  audio_uploaded_at timestamptz,
  transcription_summary text,
  message_to_student text,
  internal_message text,
  acceleration integer,
  braking integer,
  left_turns integer,
  right_turns integer,
  speed_maintenance integer,
  lane_maintenance integer,
  blind_spots integer,
  signal_usage integer,
  changing_lanes integer,
  following_distance integer,
  road_sign_awareness integer,
  distractions integer,
  general_parking integer,
  reverse_parking integer,
  parallel_parking integer,
  straight_line_backing integer,
  turn_about integer,
  merging integer,
  interstate integer,
  overall integer,
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
SET search_path TO 'public'
AS $function$
  SELECT
    rc.id,
    rc.created_at,
    rc.session_id,
    rc.student_id,
    rc.instructor_id,
    rc.lesson_audio_url,
    rc.audio_path,
    rc.audio_mime,
    rc.audio_size_bytes,
    rc.audio_original_name,
    rc.audio_uploaded_at,
    rc.transcription_summary,
    rc.message_to_student,
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
      rc.student_id = auth.uid()
      OR rc.instructor_id = auth.uid()
      OR is_staff_or_admin(auth.uid())
    );
$function$;