
-- Add is_edited and edited_at columns to report_card_ratings
ALTER TABLE public.report_card_ratings
  ADD COLUMN IF NOT EXISTS is_edited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone;

-- Add UPDATE policy so users can edit their own ratings
CREATE POLICY "Users can update own ratings"
  ON public.report_card_ratings
  FOR UPDATE
  TO anon, authenticated
  USING (
    (student_id = auth.uid())
    OR (is_public_view = true AND student_id IS NULL)
  )
  WITH CHECK (
    (student_id = auth.uid())
    OR (is_public_view = true AND student_id IS NULL)
  );
