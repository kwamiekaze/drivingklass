
-- Add session_type column to sessions
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS session_type TEXT NOT NULL DEFAULT 'driving';

-- Add constraint for allowed values (using validation trigger instead of CHECK)
CREATE OR REPLACE FUNCTION public.validate_session_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_type NOT IN ('driving', 'testing') THEN
    RAISE EXCEPTION 'session_type must be driving or testing';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_session_type_trigger
BEFORE INSERT OR UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.validate_session_type();

-- Create road_test_results table
CREATE TABLE IF NOT EXISTS public.road_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  instructor_id UUID NOT NULL REFERENCES public.profiles(id),
  result TEXT NOT NULL CHECK (result IN ('passed', 'failed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);

-- Enable RLS
ALTER TABLE public.road_test_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for road_test_results
CREATE POLICY "Staff admin can manage all road test results"
ON public.road_test_results
FOR ALL
USING (is_staff_or_admin(auth.uid()));

CREATE POLICY "Instructors can manage own road test results"
ON public.road_test_results
FOR ALL
USING (instructor_id = auth.uid());

CREATE POLICY "Students can view own road test results"
ON public.road_test_results
FOR SELECT
USING (student_id = auth.uid());
