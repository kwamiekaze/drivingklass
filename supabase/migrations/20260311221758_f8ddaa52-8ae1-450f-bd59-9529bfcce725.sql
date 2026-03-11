
CREATE TABLE public.map_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pin_type text NOT NULL DEFAULT 'custom',
  custom_address text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.map_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff admin can manage map pins"
  ON public.map_pins FOR ALL
  USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Instructors can view relevant map pins"
  ON public.map_pins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.instructor_students ist
      WHERE ist.instructor_id = auth.uid() AND ist.student_id = map_pins.student_id
    )
    OR EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.instructor_id = auth.uid() AND s.student_id = map_pins.student_id
    )
  );
