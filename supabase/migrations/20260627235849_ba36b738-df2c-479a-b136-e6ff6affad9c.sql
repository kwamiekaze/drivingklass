
CREATE OR REPLACE FUNCTION public.get_email_render(p_log_id uuid)
RETURNS TABLE(
  id uuid,
  message_id text,
  template_name text,
  recipient_email text,
  status text,
  error_message text,
  created_at timestamptz,
  subject text,
  html text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  is_instructor boolean;
  v_recipient text;
  allowed boolean := false;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','staff')) INTO is_admin;
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'instructor') INTO is_instructor;

  IF NOT is_admin AND NOT is_instructor THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  SELECT lower(l.recipient_email) INTO v_recipient FROM public.email_send_log l WHERE l.id = p_log_id;
  IF v_recipient IS NULL THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF is_admin THEN
    allowed := true;
  ELSE
    SELECT EXISTS (
      WITH my_emails AS (
        SELECT lower(p.email) AS email FROM public.profiles p WHERE p.id = auth.uid() AND p.email IS NOT NULL
        UNION
        SELECT lower(p.email) FROM public.profiles p JOIN public.instructor_students s ON s.student_id = p.id WHERE s.instructor_id = auth.uid() AND p.email IS NOT NULL
        UNION
        SELECT lower(p.guardian_email) FROM public.profiles p JOIN public.instructor_students s ON s.student_id = p.id WHERE s.instructor_id = auth.uid() AND p.guardian_email IS NOT NULL
        UNION
        SELECT lower(p.email) FROM public.profiles p JOIN public.sessions ss ON ss.student_id = p.id WHERE ss.instructor_id = auth.uid() AND p.email IS NOT NULL
        UNION
        SELECT lower(p.guardian_email) FROM public.profiles p JOIN public.sessions ss ON ss.student_id = p.id WHERE ss.instructor_id = auth.uid() AND p.guardian_email IS NOT NULL
      )
      SELECT 1 FROM my_emails WHERE email = v_recipient
    ) INTO allowed;
  END IF;

  IF NOT allowed THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  RETURN QUERY
    SELECT l.id, l.message_id, l.template_name, l.recipient_email, l.status, l.error_message, l.created_at,
           COALESCE(
             (SELECT lr.metadata->>'subject' FROM public.email_send_log lr WHERE lr.message_id = l.message_id AND lr.metadata ? 'subject' ORDER BY lr.created_at ASC LIMIT 1),
             ''
           ) AS subject,
           COALESCE(
             (SELECT lr.metadata->>'html' FROM public.email_send_log lr WHERE lr.message_id = l.message_id AND lr.metadata ? 'html' ORDER BY lr.created_at ASC LIMIT 1),
             ''
           ) AS html
    FROM public.email_send_log l
    WHERE l.id = p_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_render(uuid) TO authenticated;
