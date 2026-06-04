CREATE OR REPLACE FUNCTION public.can_view_student_full_schedule(_student_id uuid, _viewer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_staff_or_admin(_viewer_id)
    OR EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.student_id = _student_id
        AND s.instructor_id = _viewer_id
    )
    OR EXISTS (
      SELECT 1 FROM public.instructor_students ist
      WHERE ist.student_id = _student_id
        AND ist.instructor_id = _viewer_id
    )
$$;

DROP POLICY IF EXISTS "Instructors can view full schedules for taught students" ON public.sessions;
CREATE POLICY "Instructors can view full schedules for taught students"
ON public.sessions
FOR SELECT
TO authenticated
USING (public.can_view_student_full_schedule(student_id, auth.uid()));

DROP POLICY IF EXISTS "Instructors can manage taught student schedule shares" ON public.student_schedule_shares;
CREATE POLICY "Instructors can manage taught student schedule shares"
ON public.student_schedule_shares
FOR ALL
TO authenticated
USING (public.can_view_student_full_schedule(student_id, auth.uid()))
WITH CHECK (public.can_view_student_full_schedule(student_id, auth.uid()));

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_schedule_shares_unique_student ON public.student_schedule_shares(student_id);