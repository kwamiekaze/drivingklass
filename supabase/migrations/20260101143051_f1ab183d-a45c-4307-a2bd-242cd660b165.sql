-- Add status column to contact_submissions
ALTER TABLE public.contact_submissions 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'new';

-- Create id-uploads bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-uploads', 'id-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for id-uploads bucket

-- Anyone can upload (needed for anonymous form submission)
CREATE POLICY "Anyone can upload ID files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'id-uploads');

-- Only admins can read/download
CREATE POLICY "Admins can view ID files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'id-uploads' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Only admins can delete
CREATE POLICY "Admins can delete ID files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'id-uploads' 
  AND public.has_role(auth.uid(), 'admin')
);