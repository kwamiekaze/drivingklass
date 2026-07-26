ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_media_type text NOT NULL DEFAULT 'image';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_avatar_media_type_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_avatar_media_type_check
      CHECK (avatar_media_type IN ('image','video'));
  END IF;
END $$;

-- Profile media bucket policies (bucket 'profile-media', private)
DROP POLICY IF EXISTS "Authenticated can view profile media" ON storage.objects;
CREATE POLICY "Authenticated can view profile media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'profile-media');

DROP POLICY IF EXISTS "Users can upload own profile media" ON storage.objects;
CREATE POLICY "Users can upload own profile media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update own profile media" ON storage.objects;
CREATE POLICY "Users can update own profile media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own profile media" ON storage.objects;
CREATE POLICY "Users can delete own profile media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );