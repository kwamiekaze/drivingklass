
CREATE TABLE IF NOT EXISTS public.schedule_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Unavailable',
  notes text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  instructor_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff admin can manage schedule blocks"
ON public.schedule_blocks FOR ALL
USING (public.is_staff_or_admin(auth.uid()))
WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Instructors can view their schedule blocks"
ON public.schedule_blocks FOR SELECT
USING (instructor_id = auth.uid() OR instructor_id IS NULL);

CREATE TRIGGER schedule_blocks_set_updated_at
BEFORE UPDATE ON public.schedule_blocks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_schedule_blocks_starts_at ON public.schedule_blocks(starts_at);
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_instructor ON public.schedule_blocks(instructor_id);
