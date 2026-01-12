-- =========================================================
-- Fix storage policies for permits bucket
-- The actual path format is: {student_id}/{timestamp}_{filename}
-- =========================================================

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Students upload own pending permits" ON storage.objects;
DROP POLICY IF EXISTS "Students read own permits" ON storage.objects;

-- Students can upload to their own folder: {student_id}/...
CREATE POLICY "Students can upload own permits"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'permits'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Students can read their own permits
CREATE POLICY "Students can read own permits"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'permits'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Students can update their own permits
CREATE POLICY "Students can update own permits"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'permits'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'permits'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Students can delete their own permits
CREATE POLICY "Students can delete own permits"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'permits'
  AND (storage.foldername(name))[1] = auth.uid()::text
);