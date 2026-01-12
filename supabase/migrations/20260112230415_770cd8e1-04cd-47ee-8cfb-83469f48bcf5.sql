-- Add updated_at column to permit_documents
ALTER TABLE public.permit_documents 
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Create or replace the set_updated_at function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trg_permit_updated_at ON public.permit_documents;
CREATE TRIGGER trg_permit_updated_at
BEFORE UPDATE ON public.permit_documents
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Delete duplicate permits, keeping only the newest per (user_id, source)
DELETE FROM public.permit_documents
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id, source ORDER BY created_at DESC) as rn
    FROM public.permit_documents
  ) ranked
  WHERE rn > 1
);