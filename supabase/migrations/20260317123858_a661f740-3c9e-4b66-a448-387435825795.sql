
-- Add document_type and is_current to permit_documents
ALTER TABLE public.permit_documents 
ADD COLUMN IF NOT EXISTS document_type text NOT NULL DEFAULT 'permit',
ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT true;

-- Allow students to read their own permit documents (already exists)
-- Add policy for students to insert from profile source
-- Update existing records to be current
UPDATE public.permit_documents SET is_current = true WHERE is_current IS NULL;

-- When a new document is uploaded, mark previous documents of same type as not current
CREATE OR REPLACE FUNCTION public.manage_document_currency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Mark previous documents of same type for same student as not current
  IF NEW.is_current = true THEN
    UPDATE public.permit_documents
    SET is_current = false, updated_at = now()
    WHERE student_id = NEW.student_id
      AND document_type = NEW.document_type
      AND id != NEW.id
      AND is_current = true;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS manage_document_currency ON public.permit_documents;
CREATE TRIGGER manage_document_currency
  AFTER INSERT OR UPDATE OF is_current ON public.permit_documents
  FOR EACH ROW
  WHEN (NEW.is_current = true)
  EXECUTE FUNCTION public.manage_document_currency();
