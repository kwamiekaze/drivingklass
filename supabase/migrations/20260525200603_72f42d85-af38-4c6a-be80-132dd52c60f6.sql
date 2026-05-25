
-- Server-side intake drafts so students can resume on any device
CREATE TABLE IF NOT EXISTS public.intake_drafts (
  user_id uuid PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_step integer NOT NULL DEFAULT 1,
  permit_file_path text,
  permit_file_name text,
  permit_mime_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.intake_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own intake draft"
  ON public.intake_drafts FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Staff admin can read intake drafts"
  ON public.intake_drafts FOR SELECT
  USING (public.is_staff_or_admin(auth.uid()));

CREATE TRIGGER intake_drafts_set_updated_at
  BEFORE UPDATE ON public.intake_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Expand contact_submissions for intake-aligned fields + admin conversion
ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS pickup_address text,
  ADD COLUMN IF NOT EXISTS dropoff_address text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS permit_attachment_path text,
  ADD COLUMN IF NOT EXISTS permit_attachment_name text,
  ADD COLUMN IF NOT EXISTS converted_profile_id uuid,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz,
  ADD COLUMN IF NOT EXISTS converted_by uuid;
