-- Create the permits storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('permits', 'permits', true)
ON CONFLICT (id) DO NOTHING;

-- Allow admins/staff to read all permits
CREATE POLICY "Admins can view all permits"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'permits' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'staff')
  )
);

-- Allow users to view their own permits
CREATE POLICY "Users can view own permits"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'permits' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to upload their own permits
CREATE POLICY "Users can upload own permits"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'permits' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins to upload permits for any user
CREATE POLICY "Admins can upload permits"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'permits' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'staff')
  )
);