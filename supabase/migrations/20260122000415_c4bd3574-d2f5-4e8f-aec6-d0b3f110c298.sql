-- ============================================================
-- HOURS DEDUCTION FIX - Idempotent, trigger-based automation
-- ============================================================

-- A) Create session_hour_deductions table for idempotent tracking
CREATE TABLE IF NOT EXISTS public.session_hour_deductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE,
  student_id uuid NOT NULL,
  deducted_hours numeric(6,2) NOT NULL,
  deducted_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL DEFAULT 'session_completed',
  CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_session_hour_deductions_student ON public.session_hour_deductions(student_id);
CREATE INDEX IF NOT EXISTS idx_session_hour_deductions_session ON public.session_hour_deductions(session_id);

-- Enable RLS
ALTER TABLE public.session_hour_deductions ENABLE ROW LEVEL SECURITY;

-- RLS: Admins/staff can see all, instructors can see sessions they taught, students see their own
CREATE POLICY "Staff/admin can view all deductions" ON public.session_hour_deductions
  FOR SELECT USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Students can view own deductions" ON public.session_hour_deductions
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Instructors can view deductions for their sessions" ON public.session_hour_deductions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sessions s 
      WHERE s.id = session_hour_deductions.session_id 
      AND s.instructor_id = auth.uid()
    )
  );

-- Only system (via SECURITY DEFINER functions) can insert
CREATE POLICY "No direct inserts" ON public.session_hour_deductions
  FOR INSERT WITH CHECK (false);


-- B) Create the main deduction function (SECURITY DEFINER for bypassing RLS)
CREATE OR REPLACE FUNCTION public.apply_session_hour_deduction(p_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session record;
  v_duration_hours numeric(6,2);
  v_current_hours numeric(10,2);
  v_new_hours numeric(10,2);
  v_inserted boolean := false;
BEGIN
  -- 1. Get session details
  SELECT id, student_id, duration_minutes, status, hours_deducted_at
  INTO v_session
  FROM public.sessions
  WHERE id = p_session_id;
  
  IF v_session.id IS NULL THEN
    RAISE NOTICE 'Session not found: %', p_session_id;
    RETURN false;
  END IF;
  
  -- 2. Check if session qualifies for deduction (completed OR has report card)
  IF v_session.status != 'completed' THEN
    -- Check if there's a report card (which means it should be completed)
    IF NOT EXISTS (SELECT 1 FROM public.report_cards WHERE session_id = p_session_id) THEN
      RAISE NOTICE 'Session % not completed and has no report card', p_session_id;
      RETURN false;
    END IF;
  END IF;
  
  -- 3. Calculate duration in hours (round to 2 decimal places)
  v_duration_hours := ROUND(v_session.duration_minutes::numeric / 60.0, 2);
  
  IF v_duration_hours <= 0 THEN
    RAISE NOTICE 'Invalid duration for session %: % minutes', p_session_id, v_session.duration_minutes;
    RETURN false;
  END IF;
  
  -- 4. Attempt idempotent insert (unique constraint on session_id prevents duplicates)
  BEGIN
    INSERT INTO public.session_hour_deductions (session_id, student_id, deducted_hours, reason)
    VALUES (p_session_id, v_session.student_id, v_duration_hours, 'session_completed');
    v_inserted := true;
  EXCEPTION WHEN unique_violation THEN
    -- Already deducted, this is fine - idempotent behavior
    RAISE NOTICE 'Hours already deducted for session %', p_session_id;
    RETURN true;
  END;
  
  -- 5. If we inserted, deduct from student's hours_remaining
  IF v_inserted THEN
    -- Get current hours
    SELECT COALESCE(hours_remaining, 0) INTO v_current_hours
    FROM public.profiles
    WHERE id = v_session.student_id;
    
    -- Calculate new hours (never below 0)
    v_new_hours := GREATEST(v_current_hours - v_duration_hours, 0);
    
    -- Update student profile
    UPDATE public.profiles
    SET hours_remaining = v_new_hours,
        updated_at = now()
    WHERE id = v_session.student_id;
    
    -- Also mark session as hours_deducted_at
    UPDATE public.sessions
    SET hours_deducted_at = now()
    WHERE id = p_session_id AND hours_deducted_at IS NULL;
    
    RAISE NOTICE 'Deducted % hours from student %. % -> %', 
      v_duration_hours, v_session.student_id, v_current_hours, v_new_hours;
  END IF;
  
  RETURN true;
END;
$$;


-- C) Update the on_report_card_created trigger to also deduct hours
CREATE OR REPLACE FUNCTION public.on_report_card_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Mark session as completed when report card is created
  UPDATE public.sessions 
  SET completed = true, 
      status = 'completed',
      completed_at = now(),
      completed_by = NEW.instructor_id
  WHERE id = NEW.session_id
    AND status != 'completed';  -- Only update if not already completed
  
  -- Apply hour deduction (idempotent - won't double deduct)
  PERFORM public.apply_session_hour_deduction(NEW.session_id);
  
  -- Notify student about new report card
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    NEW.student_id,
    'New Report Card',
    'Your instructor has submitted a report card for your lesson.',
    'report_card_posted'
  );
  
  RETURN NEW;
END;
$$;


-- D) Create trigger for session completion (when status changes to completed)
CREATE OR REPLACE FUNCTION public.on_session_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only act when status changes TO 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Apply hour deduction (idempotent - won't double deduct)
    PERFORM public.apply_session_hour_deduction(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS on_session_completed_trigger ON public.sessions;
CREATE TRIGGER on_session_completed_trigger
AFTER UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.on_session_completed();


-- E) RETROACTIVE BACKFILL - Apply deductions for all completed sessions that haven't been deducted
DO $$
DECLARE
  v_session record;
  v_count integer := 0;
BEGIN
  -- Find all sessions that are completed OR have a report card, but no deduction record
  FOR v_session IN
    SELECT DISTINCT s.id
    FROM public.sessions s
    LEFT JOIN public.session_hour_deductions shd ON shd.session_id = s.id
    LEFT JOIN public.report_cards rc ON rc.session_id = s.id
    WHERE shd.id IS NULL
      AND (s.status = 'completed' OR rc.id IS NOT NULL)
  LOOP
    PERFORM public.apply_session_hour_deduction(v_session.id);
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Backfilled % sessions with hour deductions', v_count;
END;
$$;


-- F) Create admin-only function for manual recalculation
CREATE OR REPLACE FUNCTION public.recalculate_all_student_hours()
RETURNS TABLE(student_id uuid, old_hours numeric, new_hours numeric, sessions_processed integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_student record;
  v_total_deducted numeric;
  v_old_hours numeric;
  v_new_hours numeric;
BEGIN
  -- Verify caller is admin
  IF NOT public.is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can recalculate hours';
  END IF;
  
  FOR v_student IN
    SELECT DISTINCT p.id, p.hours_remaining
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE ur.role = 'student'
  LOOP
    v_old_hours := COALESCE(v_student.hours_remaining, 0);
    
    -- Sum all deductions for this student
    SELECT COALESCE(SUM(deducted_hours), 0)
    INTO v_total_deducted
    FROM public.session_hour_deductions
    WHERE session_hour_deductions.student_id = v_student.id;
    
    -- The hours_remaining should match what's recorded
    -- Note: This function is for verification, not correction
    -- Actual correction would require knowing the initial hours purchased
    
    student_id := v_student.id;
    old_hours := v_old_hours;
    new_hours := v_old_hours;  -- No change in this version - for debugging
    sessions_processed := (SELECT COUNT(*) FROM public.session_hour_deductions WHERE session_hour_deductions.student_id = v_student.id);
    
    RETURN NEXT;
  END LOOP;
END;
$$;