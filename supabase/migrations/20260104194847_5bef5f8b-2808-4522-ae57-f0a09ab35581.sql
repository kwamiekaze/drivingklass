
-- Remove the bidirectional FK that causes ambiguous embeds
-- Drop the foreign key constraint from sessions.report_card_id to report_cards.id
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS fk_report_card;

-- Keep the column but remove the FK relationship so PostgREST won't see two paths
-- The session.report_card_id column is still useful as a denormalized reference
-- but won't cause embed ambiguity

-- Update the on_report_card_created trigger to NOT set report_card_id on session
-- since that was causing the bidirectional relationship
DROP TRIGGER IF EXISTS on_report_card_created_trigger ON public.report_cards;

CREATE OR REPLACE FUNCTION public.on_report_card_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Mark session as completed when report card is created
  UPDATE public.sessions 
  SET completed = true, 
      status = 'completed',
      completed_at = now(),
      completed_by = NEW.instructor_id
  WHERE id = NEW.session_id;
  
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

CREATE TRIGGER on_report_card_created_trigger
AFTER INSERT ON public.report_cards
FOR EACH ROW
EXECUTE FUNCTION public.on_report_card_created();
