CREATE OR REPLACE FUNCTION public.list_visible_emails(p_limit integer DEFAULT 200, p_search text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, message_id text, template_name text, recipient_email text, status text, error_message text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_admin boolean;
  is_instructor boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
  ) INTO is_admin;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'instructor'
  ) INTO is_instructor;

  IF NOT is_admin AND NOT is_instructor THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  IF is_admin THEN
    RETURN QUERY
      SELECT l.id, l.message_id, l.template_name, l.recipient_email,
             l.status, l.error_message, l.created_at
      FROM public.email_send_log l
      WHERE p_search IS NULL OR l.recipient_email ILIKE '%' || p_search || '%'
         OR l.template_name ILIKE '%' || p_search || '%'
      ORDER BY l.created_at DESC
      LIMIT p_limit;
  ELSE
    RETURN QUERY
      WITH my_emails AS (
        SELECT lower(p.email) AS email FROM public.profiles p WHERE p.id = auth.uid() AND p.email IS NOT NULL
        UNION
        SELECT lower(p.email) FROM public.profiles p
        JOIN public.instructor_students s ON s.student_id = p.id
        WHERE s.instructor_id = auth.uid() AND p.email IS NOT NULL
        UNION
        SELECT lower(p.guardian_email) FROM public.profiles p
        JOIN public.instructor_students s ON s.student_id = p.id
        WHERE s.instructor_id = auth.uid() AND p.guardian_email IS NOT NULL
        UNION
        SELECT lower(p.email) FROM public.profiles p
        JOIN public.sessions ss ON ss.student_id = p.id
        WHERE ss.instructor_id = auth.uid() AND p.email IS NOT NULL
        UNION
        SELECT lower(p.guardian_email) FROM public.profiles p
        JOIN public.sessions ss ON ss.student_id = p.id
        WHERE ss.instructor_id = auth.uid() AND p.guardian_email IS NOT NULL
      )
      SELECT l.id, l.message_id, l.template_name, l.recipient_email,
             l.status, l.error_message, l.created_at
      FROM public.email_send_log l
      WHERE lower(l.recipient_email) IN (SELECT email FROM my_emails WHERE email IS NOT NULL)
        AND (p_search IS NULL OR l.recipient_email ILIKE '%' || p_search || '%'
             OR l.template_name ILIKE '%' || p_search || '%')
      ORDER BY l.created_at DESC
      LIMIT p_limit;
END IF;
END;
$function$;