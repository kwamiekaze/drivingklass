
DO $$ BEGIN
  DROP POLICY IF EXISTS "Instructors can view their schedule blocks" ON public.schedule_blocks;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Instructors can view all schedule blocks"
    ON public.schedule_blocks FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('instructor', 'staff', 'admin')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.report_cards
  ADD COLUMN IF NOT EXISTS public_send_to_guardian boolean NOT NULL DEFAULT false;

ALTER TABLE public.report_cards
  ADD COLUMN IF NOT EXISTS time_split jsonb;

CREATE OR REPLACE FUNCTION public.list_visible_emails(
  p_limit int DEFAULT 200,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  message_id text,
  template_name text,
  recipient_email text,
  status text,
  error_message text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        SELECT p.email FROM public.profiles p WHERE p.id = auth.uid()
        UNION
        SELECT p.email FROM public.profiles p
        JOIN public.instructor_students s ON s.student_id = p.id
        WHERE s.instructor_id = auth.uid() AND p.email IS NOT NULL
        UNION
        SELECT p.email FROM public.profiles p
        JOIN public.sessions ss ON ss.student_id = p.id
        WHERE ss.instructor_id = auth.uid() AND p.email IS NOT NULL
      )
      SELECT l.id, l.message_id, l.template_name, l.recipient_email,
             l.status, l.error_message, l.created_at
      FROM public.email_send_log l
      WHERE l.recipient_email IN (SELECT email FROM my_emails WHERE email IS NOT NULL)
        AND (p_search IS NULL OR l.recipient_email ILIKE '%' || p_search || '%'
             OR l.template_name ILIKE '%' || p_search || '%')
      ORDER BY l.created_at DESC
      LIMIT p_limit;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.list_visible_emails(int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_visible_emails(int, text) TO authenticated;
