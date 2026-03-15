
CREATE TABLE public.report_card_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_card_id uuid NOT NULL REFERENCES public.report_cards(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions(id),
  student_id uuid REFERENCES public.profiles(id),
  instructor_id uuid REFERENCES public.profiles(id),
  rating_value integer NOT NULL CHECK (rating_value >= 1 AND rating_value <= 5),
  feedback_text text,
  submitted_by_role text,
  submitted_by_name text,
  is_public_view boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(report_card_id, student_id),
  UNIQUE(report_card_id, is_public_view) 
);

-- Add a partial unique index for public views (one rating per report card for anonymous)
DROP INDEX IF EXISTS idx_report_card_ratings_public_unique;
CREATE UNIQUE INDEX idx_report_card_ratings_public_unique 
ON public.report_card_ratings (report_card_id) 
WHERE is_public_view = true AND student_id IS NULL;

-- Drop the table-level unique on (report_card_id, is_public_view) since partial index handles it
ALTER TABLE public.report_card_ratings DROP CONSTRAINT IF EXISTS report_card_ratings_report_card_id_is_public_view_key;

ALTER TABLE public.report_card_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can insert ratings (students + anonymous public viewers)
CREATE POLICY "Anyone can insert ratings"
ON public.report_card_ratings
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Users can view ratings on report cards they can access
CREATE POLICY "Anyone can view ratings"
ON public.report_card_ratings
FOR SELECT
TO anon, authenticated
USING (true);

-- Staff/admin can manage all ratings
CREATE POLICY "Staff admin can manage ratings"
ON public.report_card_ratings
FOR ALL
TO authenticated
USING (public.is_staff_or_admin(auth.uid()));

-- Updated at trigger
CREATE TRIGGER set_report_card_ratings_updated_at
  BEFORE UPDATE ON public.report_card_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
