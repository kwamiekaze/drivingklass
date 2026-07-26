
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hours_completed NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating NUMERIC NOT NULL DEFAULT 5;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_rating_range') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_rating_range CHECK (rating >= 0 AND rating <= 5);
  END IF;
END $$;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS hours_counted BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.accumulate_student_hours_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hours NUMERIC;
BEGIN
  IF NEW.status = 'completed'
     AND COALESCE(NEW.hours_counted, false) = false
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed')
     AND NEW.student_id IS NOT NULL
     AND COALESCE(NEW.duration_minutes, 0) > 0 THEN
    v_hours := ROUND(NEW.duration_minutes::numeric / 60.0, 2);
    UPDATE public.profiles
       SET hours_completed = COALESCE(hours_completed, 0) + v_hours,
           updated_at = now()
     WHERE id = NEW.student_id;
    NEW.hours_counted := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sessions_accumulate_hours ON public.sessions;
CREATE TRIGGER trg_sessions_accumulate_hours
  BEFORE INSERT OR UPDATE OF status ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.accumulate_student_hours_completed();

-- Backfill hours_completed from already-completed sessions (and sessions with report cards)
WITH agg AS (
  SELECT s.student_id, ROUND(SUM(s.duration_minutes)::numeric / 60.0, 2) AS h
  FROM public.sessions s
  LEFT JOIN public.report_cards rc ON rc.session_id = s.id
  WHERE (s.status = 'completed' OR rc.session_id IS NOT NULL)
    AND s.status <> 'cancelled'
    AND s.student_id IS NOT NULL
    AND COALESCE(s.duration_minutes, 0) > 0
  GROUP BY s.student_id
)
UPDATE public.profiles p
   SET hours_completed = COALESCE(agg.h, 0)
  FROM agg
 WHERE p.id = agg.student_id;

UPDATE public.sessions s
   SET hours_counted = true
 WHERE hours_counted = false
   AND (s.status = 'completed'
        OR EXISTS (SELECT 1 FROM public.report_cards rc WHERE rc.session_id = s.id));

-- Seed Quamie John
UPDATE public.profiles
   SET hours_completed = 3422, rating = 5
 WHERE id = '73564bc6-d617-401e-a582-e0e02145a264';
