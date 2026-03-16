
-- Add report_card_status column to report_cards table
ALTER TABLE public.report_cards 
ADD COLUMN report_card_status text NOT NULL DEFAULT 'completed';

-- Add submitted_at timestamp for tracking when report was officially submitted
ALTER TABLE public.report_cards 
ADD COLUMN submitted_at timestamp with time zone;

-- For existing report cards, set submitted_at to created_at since they are all completed
UPDATE public.report_cards SET submitted_at = created_at WHERE report_card_status = 'completed';

-- Update student RLS policy to only show completed report cards
DROP POLICY IF EXISTS "Students can view own report cards" ON public.report_cards;
CREATE POLICY "Students can view own report cards"
ON public.report_cards
FOR SELECT
USING (student_id = auth.uid() AND report_card_status = 'completed');

-- Update public RLS policy to only show completed cards
DROP POLICY IF EXISTS "Public can read public report cards by slug" ON public.report_cards;
CREATE POLICY "Public can read public report cards by slug"
ON public.report_cards
FOR SELECT TO anon
USING (is_public = true AND public_share_slug IS NOT NULL AND report_card_status = 'completed');

-- Replace the on_report_card_created trigger function to only fire for completed cards
CREATE OR REPLACE FUNCTION public.on_report_card_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only process completed report cards
  IF NEW.report_card_status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- If updating from non-completed to completed, treat as submission
  IF TG_OP = 'UPDATE' AND OLD.report_card_status != 'completed' AND NEW.report_card_status = 'completed' THEN
    -- Set submitted_at if not already set
    IF NEW.submitted_at IS NULL THEN
      NEW.submitted_at := now();
    END IF;
  END IF;

  -- Mark session as completed when report card is completed
  UPDATE public.sessions 
  SET completed = true, 
      status = 'completed',
      completed_at = now(),
      completed_by = NEW.instructor_id
  WHERE id = NEW.session_id
    AND status != 'completed';
  
  -- Apply hour deduction (idempotent)
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
$function$;

-- Drop and recreate the trigger to fire on both INSERT and UPDATE
DROP TRIGGER IF EXISTS on_report_card_created ON public.report_cards;
CREATE TRIGGER on_report_card_created
  BEFORE INSERT OR UPDATE ON public.report_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.on_report_card_created();
