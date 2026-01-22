-- =============================================
-- FIX: Remaining Hours = Purchased Hours - Completed Hours
-- A session is "completed" if status='completed' OR has a report card
-- =============================================

-- 1) Add purchased_hours column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS purchased_hours numeric NOT NULL DEFAULT 0;

-- 2) Function to compute COMPLETED hours (sessions that are done)
CREATE OR REPLACE FUNCTION public.compute_completed_hours(p_student_id uuid)
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
    AND s.status != 'cancelled'  -- Exclude cancelled sessions
    AND (
      s.status = 'completed'
      OR rc.session_id IS NOT NULL  -- Has a report card
    );
$$;

-- 3) Function to compute remaining hours (purchased - completed, clamped to 0)
CREATE OR REPLACE FUNCTION public.compute_remaining_hours(p_student_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(
    COALESCE(p.purchased_hours, 0) - public.compute_completed_hours(p_student_id),
    0
  )::numeric
  FROM public.profiles p
  WHERE p.id = p_student_id;
$$;

-- 4) Recalc and persist function
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

-- 5) Trigger for sessions changes
CREATE OR REPLACE FUNCTION public.tg_sessions_recalc_remaining_hours()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
BEGIN
  v_student_id := COALESCE(NEW.student_id, OLD.student_id);
  
  IF v_student_id IS NOT NULL THEN
    PERFORM public.recalc_student_remaining_hours(v_student_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sessions_recalc_remaining_hours ON public.sessions;
CREATE TRIGGER trg_sessions_recalc_remaining_hours
AFTER INSERT OR UPDATE OR DELETE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.tg_sessions_recalc_remaining_hours();

-- 6) Trigger for report_cards changes
CREATE OR REPLACE FUNCTION public.tg_report_cards_recalc_remaining_hours()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_session_id uuid;
BEGIN
  v_session_id := COALESCE(NEW.session_id, OLD.session_id);

  SELECT s.student_id INTO v_student_id
  FROM public.sessions s
  WHERE s.id = v_session_id;

  IF v_student_id IS NOT NULL THEN
    PERFORM public.recalc_student_remaining_hours(v_student_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_report_cards_recalc_remaining_hours ON public.report_cards;
CREATE TRIGGER trg_report_cards_recalc_remaining_hours
AFTER INSERT OR UPDATE OR DELETE ON public.report_cards
FOR EACH ROW
EXECUTE FUNCTION public.tg_report_cards_recalc_remaining_hours();

-- 7) Trigger for purchased_hours changes on profiles
CREATE OR REPLACE FUNCTION public.tg_profiles_purchased_hours_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only recalc if purchased_hours actually changed
  IF OLD.purchased_hours IS DISTINCT FROM NEW.purchased_hours THEN
    NEW.hours_remaining := public.compute_remaining_hours(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_purchased_hours_changed ON public.profiles;
CREATE TRIGGER trg_profiles_purchased_hours_changed
BEFORE UPDATE OF purchased_hours ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.tg_profiles_purchased_hours_changed();

-- 8) BACKFILL: Reconstruct purchased_hours from existing data
-- purchased_hours = current scheduled hours + completed hours
-- This preserves the intent: what they had remaining + what they used = what they bought
UPDATE public.profiles p
SET purchased_hours = (
  -- Current scheduled (non-completed) hours
  COALESCE((
    SELECT SUM(s.duration_minutes / 60.0)
    FROM public.sessions s
    LEFT JOIN public.report_cards rc ON rc.session_id = s.id
    WHERE s.student_id = p.id
      AND s.status NOT IN ('cancelled', 'completed')
      AND rc.session_id IS NULL
  ), 0)
  +
  -- Plus completed hours
  COALESCE((
    SELECT SUM(s.duration_minutes / 60.0)
    FROM public.sessions s
    LEFT JOIN public.report_cards rc ON rc.session_id = s.id
    WHERE s.student_id = p.id
      AND s.status != 'cancelled'
      AND (s.status = 'completed' OR rc.session_id IS NOT NULL)
  ), 0)
);

-- 9) Now recalc remaining_hours for all profiles
UPDATE public.profiles p
SET hours_remaining = public.compute_remaining_hours(p.id),
    updated_at = now();

-- 10) Grant execute permissions
GRANT EXECUTE ON FUNCTION public.compute_completed_hours(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_remaining_hours(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalc_student_remaining_hours(uuid) TO authenticated;