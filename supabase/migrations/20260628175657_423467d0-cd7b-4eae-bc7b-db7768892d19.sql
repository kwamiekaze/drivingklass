
CREATE OR REPLACE FUNCTION public.auto_link_instructor_student_from_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.instructor_id IS NOT NULL AND NEW.student_id IS NOT NULL THEN
    INSERT INTO public.instructor_students (instructor_id, student_id)
    VALUES (NEW.instructor_id, NEW.student_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_link_instructor_student ON public.sessions;
CREATE TRIGGER trg_auto_link_instructor_student
AFTER INSERT OR UPDATE OF instructor_id, student_id ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.auto_link_instructor_student_from_session();

-- Backfill any existing sessions
INSERT INTO public.instructor_students (instructor_id, student_id)
SELECT DISTINCT instructor_id, student_id
FROM public.sessions
WHERE instructor_id IS NOT NULL AND student_id IS NOT NULL
ON CONFLICT DO NOTHING;
