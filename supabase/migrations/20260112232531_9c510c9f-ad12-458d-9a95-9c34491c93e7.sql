-- Standardize permit_documents schema for DrivingKlass

-- 1) Rename columns to match canonical naming (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='permit_documents' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='permit_documents' AND column_name='student_id'
  ) THEN
    ALTER TABLE public.permit_documents RENAME COLUMN user_id TO student_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='permit_documents' AND column_name='storage_path'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='permit_documents' AND column_name='file_path'
  ) THEN
    ALTER TABLE public.permit_documents RENAME COLUMN storage_path TO file_path;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='permit_documents' AND column_name='original_filename'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='permit_documents' AND column_name='file_name'
  ) THEN
    ALTER TABLE public.permit_documents RENAME COLUMN original_filename TO file_name;
  END IF;
END $$;

-- 2) Required timestamp alias (keep created_at for auditing)
ALTER TABLE public.permit_documents
  ADD COLUMN IF NOT EXISTS uploaded_at timestamptz NOT NULL DEFAULT now();

UPDATE public.permit_documents
SET uploaded_at = COALESCE(uploaded_at, created_at, now())
WHERE uploaded_at IS NULL;

-- 3) Defaults + canonical bucket
ALTER TABLE public.permit_documents
  ALTER COLUMN bucket SET DEFAULT 'permits',
  ALTER COLUMN source SET DEFAULT 'intake_form',
  ALTER COLUMN status SET DEFAULT 'pending_review';

-- 4) Ensure updated_at exists (if prior migration not applied yet)
ALTER TABLE public.permit_documents
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 5) De-dupe: keep newest per (student_id, source)
DELETE FROM public.permit_documents
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY student_id, source ORDER BY updated_at DESC, uploaded_at DESC, created_at DESC) AS rn
    FROM public.permit_documents
  ) ranked
  WHERE rn > 1
);

-- 6) Unique constraint for replace/upsert behavior
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public'
      AND indexname='permit_documents_student_source_uniq'
  ) THEN
    CREATE UNIQUE INDEX permit_documents_student_source_uniq
      ON public.permit_documents (student_id, source);
  END IF;
END $$;

-- 7) Helpful query indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public'
      AND indexname='permit_documents_student_uploaded_at_idx'
  ) THEN
    CREATE INDEX permit_documents_student_uploaded_at_idx
      ON public.permit_documents (student_id, uploaded_at DESC);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public'
      AND indexname='permit_documents_status_idx'
  ) THEN
    CREATE INDEX permit_documents_status_idx
      ON public.permit_documents (status);
  END IF;
END $$;

-- 8) RLS policies: students manage their own; staff/admin manage all
ALTER TABLE public.permit_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_documents FORCE ROW LEVEL SECURITY;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname='public' AND tablename='permit_documents'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.permit_documents', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Students can read own permit documents"
ON public.permit_documents
FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own permit documents"
ON public.permit_documents
FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own permit documents"
ON public.permit_documents
FOR UPDATE
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Staff/Admin can read all permit documents"
ON public.permit_documents
FOR SELECT
USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff/Admin can insert all permit documents"
ON public.permit_documents
FOR INSERT
WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff/Admin can update all permit documents"
ON public.permit_documents
FOR UPDATE
USING (public.is_staff_or_admin(auth.uid()))
WITH CHECK (public.is_staff_or_admin(auth.uid()));
