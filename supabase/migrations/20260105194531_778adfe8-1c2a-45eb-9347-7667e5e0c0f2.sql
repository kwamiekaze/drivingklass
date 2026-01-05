-- 1) Canonical audio fields on report_cards
ALTER TABLE public.report_cards
  ADD COLUMN IF NOT EXISTS audio_path text,
  ADD COLUMN IF NOT EXISTS audio_mime text,
  ADD COLUMN IF NOT EXISTS audio_size_bytes bigint,
  ADD COLUMN IF NOT EXISTS audio_original_name text,
  ADD COLUMN IF NOT EXISTS audio_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS audio_uploaded_by uuid;

-- 2) Private bucket for report card audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('report_card_audio', 'report_card_audio', false)
ON CONFLICT (id) DO NOTHING;

-- 3) Helper: safe uuid parse
CREATE OR REPLACE FUNCTION public.try_uuid(p_text text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN p_text::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

-- 4) Permission helpers (used by storage policies)
CREATE OR REPLACE FUNCTION public.can_read_report_card(p_report_card_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rc record;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT id, student_id, instructor_id
  INTO rc
  FROM public.report_cards
  WHERE id = p_report_card_id;

  IF rc.id IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_staff_or_admin(auth.uid()) THEN
    RETURN true;
  END IF;

  RETURN (rc.student_id = auth.uid()) OR (rc.instructor_id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.can_write_report_card_audio(p_report_card_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rc record;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_staff_or_admin(auth.uid()) THEN
    RETURN true;
  END IF;

  SELECT id, instructor_id
  INTO rc
  FROM public.report_cards
  WHERE id = p_report_card_id;

  IF rc.id IS NULL THEN
    RETURN false;
  END IF;

  RETURN rc.instructor_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.try_uuid(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_read_report_card(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_write_report_card_audio(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.try_uuid(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_report_card(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write_report_card_audio(uuid) TO authenticated;

-- 5) Storage RLS policies for report_card_audio
-- Path format enforced: report-cards/{report_card_id}/{file}

DROP POLICY IF EXISTS "Report card audio read" ON storage.objects;
CREATE POLICY "Report card audio read"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'report_card_audio'
  AND split_part(name, '/', 1) = 'report-cards'
  AND public.can_read_report_card(public.try_uuid(split_part(name, '/', 2)))
);

DROP POLICY IF EXISTS "Report card audio insert" ON storage.objects;
CREATE POLICY "Report card audio insert"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'report_card_audio'
  AND split_part(name, '/', 1) = 'report-cards'
  AND public.can_write_report_card_audio(public.try_uuid(split_part(name, '/', 2)))
);

DROP POLICY IF EXISTS "Report card audio update" ON storage.objects;
CREATE POLICY "Report card audio update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'report_card_audio'
  AND split_part(name, '/', 1) = 'report-cards'
  AND public.can_write_report_card_audio(public.try_uuid(split_part(name, '/', 2)))
);

DROP POLICY IF EXISTS "Report card audio delete" ON storage.objects;
CREATE POLICY "Report card audio delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'report_card_audio'
  AND split_part(name, '/', 1) = 'report-cards'
  AND public.can_write_report_card_audio(public.try_uuid(split_part(name, '/', 2)))
);
