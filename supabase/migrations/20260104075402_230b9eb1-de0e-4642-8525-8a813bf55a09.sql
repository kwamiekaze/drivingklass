-- Add completed_at and completed_by columns to sessions table if they don't exist
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS completed_at timestamptz,
ADD COLUMN IF NOT EXISTS completed_by uuid REFERENCES profiles(id);

-- Create or replace the trigger function to auto-complete session when report card is submitted
CREATE OR REPLACE FUNCTION public.on_report_card_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sessions 
  SET completed = true, 
      status = 'completed',
      completed_at = now(),
      completed_by = NEW.instructor_id,
      report_card_id = NEW.id
  WHERE id = NEW.session_id;
  
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

-- Drop existing trigger if exists and recreate it
DROP TRIGGER IF EXISTS on_report_card_insert ON public.report_cards;
CREATE TRIGGER on_report_card_insert
  AFTER INSERT ON public.report_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.on_report_card_created();