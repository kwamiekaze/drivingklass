
-- Add public sharing columns to report_cards
ALTER TABLE public.report_cards
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_access_code text,
  ADD COLUMN IF NOT EXISTS public_share_slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS public_enabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS public_enabled_by uuid;

-- RLS policy: allow anonymous SELECT on public report cards (verified via edge function, but needed for slug lookup)
CREATE POLICY "Public can read public report cards by slug"
  ON public.report_cards
  FOR SELECT
  TO anon
  USING (is_public = true AND public_share_slug IS NOT NULL);
