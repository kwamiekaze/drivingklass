-- Permit documents: canonical metadata table for private permit files
CREATE TABLE IF NOT EXISTS public.permit_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL DEFAULT 'permits',
  storage_path TEXT NOT NULL,
  original_filename TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  status TEXT NOT NULL DEFAULT 'pending',
  source TEXT NOT NULL DEFAULT 'intake_form',
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  UNIQUE (bucket, storage_path)
);

CREATE INDEX IF NOT EXISTS idx_permit_documents_user_created
  ON public.permit_documents (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_permit_documents_status
  ON public.permit_documents (status);

ALTER TABLE public.permit_documents ENABLE ROW LEVEL SECURITY;

-- Users can see their own permit docs
DO $$ BEGIN
  CREATE POLICY "Users can view own permit documents"
  ON public.permit_documents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Users can insert their own permit docs
DO $$ BEGIN
  CREATE POLICY "Users can insert own permit documents"
  ON public.permit_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (uploaded_by IS NULL OR uploaded_by = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin/staff can read all
DO $$ BEGIN
  CREATE POLICY "Staff admin can view all permit documents"
  ON public.permit_documents
  FOR SELECT
  TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin/staff can update all (approve/reject)
DO $$ BEGIN
  CREATE POLICY "Staff admin can update all permit documents"
  ON public.permit_documents
  FOR UPDATE
  TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ensure canonical private bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('permits', 'permits', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Remove legacy/duplicate storage policies (if they exist)
DO $$
BEGIN
  -- legacy policies created in previous iterations
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admins can view all permits') THEN
    EXECUTE 'DROP POLICY "Admins can view all permits" ON storage.objects';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admins can upload permits') THEN
    EXECUTE 'DROP POLICY "Admins can upload permits" ON storage.objects';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can view own permits') THEN
    EXECUTE 'DROP POLICY "Users can view own permits" ON storage.objects';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can upload own permits') THEN
    EXECUTE 'DROP POLICY "Users can upload own permits" ON storage.objects';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Students can view own permits') THEN
    EXECUTE 'DROP POLICY "Students can view own permits" ON storage.objects';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Students can upload own permits') THEN
    EXECUTE 'DROP POLICY "Students can upload own permits" ON storage.objects';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Staff admin can view all permits') THEN
    EXECUTE 'DROP POLICY "Staff admin can view all permits" ON storage.objects';
  END IF;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Storage policies for private permits bucket
-- 1) Students upload ONLY to pending/<uid>/*
DO $$ BEGIN
  CREATE POLICY "Students upload own pending permits"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'permits'
    AND (storage.foldername(name))[1] = 'pending'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Students can read ONLY their own files (any folder) where 2nd path segment is uid
DO $$ BEGIN
  CREATE POLICY "Students read own permits"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'permits'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Admin/staff can read any file
DO $$ BEGIN
  CREATE POLICY "Staff admin read any permits"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'permits'
    AND public.is_staff_or_admin(auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) Admin/staff can insert/update/delete any file (needed for repairs / admin uploads)
DO $$ BEGIN
  CREATE POLICY "Staff admin insert permits"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'permits'
    AND public.is_staff_or_admin(auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Staff admin update permits"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'permits'
    AND public.is_staff_or_admin(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'permits'
    AND public.is_staff_or_admin(auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Staff admin delete permits"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'permits'
    AND public.is_staff_or_admin(auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill permit_documents from legacy public.permits rows (best effort)
INSERT INTO public.permit_documents (
  user_id,
  bucket,
  storage_path,
  original_filename,
  status,
  source,
  uploaded_by,
  created_at,
  reviewed_by,
  reviewed_at,
  review_note
)
SELECT
  p.user_id,
  'permits'::text AS bucket,
  split_part(split_part(p.file_url, '/permits/', 2), '?', 1) AS storage_path,
  p.file_name AS original_filename,
  COALESCE(NULLIF(p.verified_status, ''), 'pending') AS status,
  CASE
    WHEN p.upload_source = 'intake' THEN 'intake_form'
    WHEN p.upload_source = 'chat' THEN 'message_upload'
    WHEN p.upload_source = 'admin' THEN 'admin'
    ELSE COALESCE(NULLIF(p.upload_source, ''), 'other')
  END AS source,
  p.user_id AS uploaded_by,
  p.uploaded_at AS created_at,
  p.reviewed_by,
  p.reviewed_at,
  p.admin_note
FROM public.permits p
WHERE p.file_url IS NOT NULL
  AND p.file_url LIKE '%/permits/%'
ON CONFLICT (bucket, storage_path) DO NOTHING;

-- Backfill from profiles.permit_file_url (older intake/profile uploads)
INSERT INTO public.permit_documents (
  user_id,
  bucket,
  storage_path,
  original_filename,
  status,
  source,
  uploaded_by,
  created_at
)
SELECT
  pr.id AS user_id,
  'permits'::text AS bucket,
  split_part(split_part(pr.permit_file_url, '/permits/', 2), '?', 1) AS storage_path,
  NULL AS original_filename,
  'pending'::text AS status,
  'intake_form'::text AS source,
  pr.id AS uploaded_by,
  now() AS created_at
FROM public.profiles pr
WHERE pr.permit_file_url IS NOT NULL
  AND pr.permit_file_url LIKE '%/permits/%'
ON CONFLICT (bucket, storage_path) DO NOTHING;