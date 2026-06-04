CREATE TABLE IF NOT EXISTS public.student_schedule_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_public boolean NOT NULL DEFAULT false,
  public_share_slug text UNIQUE,
  public_access_code text,
  public_enabled_at timestamp with time zone,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT student_schedule_shares_public_requires_code CHECK (
    is_public = false OR (public_share_slug IS NOT NULL AND public_access_code IS NOT NULL)
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_schedule_shares TO authenticated;
GRANT ALL ON public.student_schedule_shares TO service_role;

ALTER TABLE public.student_schedule_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff admin can manage all schedule shares"
ON public.student_schedule_shares
FOR ALL
TO authenticated
USING (public.is_staff_or_admin(auth.uid()))
WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Instructors can manage taught student schedule shares"
ON public.student_schedule_shares
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.student_id = student_schedule_shares.student_id
      AND s.instructor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.student_id = student_schedule_shares.student_id
      AND s.instructor_id = auth.uid()
  )
);

CREATE POLICY "Students can view own schedule shares"
ON public.student_schedule_shares
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_student_schedule_shares_student_id ON public.student_schedule_shares(student_id);
CREATE INDEX IF NOT EXISTS idx_student_schedule_shares_public_slug ON public.student_schedule_shares(public_share_slug) WHERE public_share_slug IS NOT NULL;

DROP TRIGGER IF EXISTS student_schedule_shares_set_updated_at ON public.student_schedule_shares;
CREATE TRIGGER student_schedule_shares_set_updated_at
BEFORE UPDATE ON public.student_schedule_shares
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();