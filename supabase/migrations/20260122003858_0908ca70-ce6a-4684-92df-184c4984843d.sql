-- =============================================
-- FIX: Remaining Hours = SUM of scheduled (not-completed) sessions
-- A session is "completed" if status='completed' OR has a report card
-- =============================================

-- 1) Create function to compute remaining hours for a student
CREATE OR REPLACE FUNCTION public.compute_remaining_hours(p_student_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(s.duration_minutes / 60.0), 0)::numeric
  FROM public.sessions s
  LEFT JOIN public.report_cards rc ON rc.session_id = s.id
  WHERE s.student_id = p_student_id
    AND s.status NOT IN ('cancelled', 'completed')  -- Not cancelled or completed
    AND rc.session_id IS NULL;  -- No report card exists
$$;

-- 2) Create function to recalculate and store remaining hours
CREATE OR REPLACE FUNCTION public.recalc_student_remaining_hours(p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET hours_remaining = public.compute_remaining_hours(p_student_id),
      updated_at = now()
  WHERE id = p_student_id;
END;
$$;

-- 3) Trigger function for sessions table
CREATE OR REPLACE FUNCTION public.tg_sessions_recalc_remaining_hours()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
BEGIN
  -- Get student_id from NEW or OLD record
  v_student_id := COALESCE(NEW.student_id, OLD.student_id);
  
  IF v_student_id IS NOT NULL THEN
    PERFORM public.recalc_student_remaining_hours(v_student_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4) Trigger function for report_cards table
CREATE OR REPLACE FUNCTION public.tg_report_cards_recalc_remaining_hours()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
BEGIN
  -- Get student_id from the associated session
  SELECT s.student_id INTO v_student_id
  FROM public.sessions s
  WHERE s.id = COALESCE(NEW.session_id, OLD.session_id);

  IF v_student_id IS NOT NULL THEN
    PERFORM public.recalc_student_remaining_hours(v_student_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5) Drop existing triggers if they exist and create new ones
DROP TRIGGER IF EXISTS trg_sessions_recalc_remaining_hours ON public.sessions;
CREATE TRIGGER trg_sessions_recalc_remaining_hours
AFTER INSERT OR UPDATE OR DELETE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.tg_sessions_recalc_remaining_hours();

DROP TRIGGER IF EXISTS trg_report_cards_recalc_remaining_hours ON public.report_cards;
CREATE TRIGGER trg_report_cards_recalc_remaining_hours
AFTER INSERT OR UPDATE OR DELETE ON public.report_cards
FOR EACH ROW
EXECUTE FUNCTION public.tg_report_cards_recalc_remaining_hours();

-- 6) BACKFILL: Recalculate remaining hours for ALL students
UPDATE public.profiles p
SET hours_remaining = public.compute_remaining_hours(p.id),
    updated_at = now();

-- 7) Grant execute permissions
GRANT EXECUTE ON FUNCTION public.compute_remaining_hours(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalc_student_remaining_hours(uuid) TO authenticated;