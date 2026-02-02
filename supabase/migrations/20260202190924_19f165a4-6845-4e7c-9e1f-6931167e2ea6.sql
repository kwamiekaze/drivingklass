-- Add columns for screenshot-based lead creation
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS attachment_path text,
ADD COLUMN IF NOT EXISTS attachment_bucket text;

-- Create storage bucket for lead attachments (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('lead-attachments', 'lead-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for lead-attachments bucket
CREATE POLICY "Admins can upload lead attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lead-attachments' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'staff')
  )
);

CREATE POLICY "Admins can view lead attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'lead-attachments' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'staff')
  )
);

CREATE POLICY "Admins can delete lead attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lead-attachments' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'staff')
  )
);