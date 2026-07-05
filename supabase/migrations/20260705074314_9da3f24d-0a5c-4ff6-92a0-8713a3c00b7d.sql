
CREATE TABLE public.guest_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT,
  level_id TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  score INTEGER NOT NULL,
  grade TEXT NOT NULL,
  distance INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.guest_scores TO anon, authenticated;
GRANT ALL ON public.guest_scores TO service_role;

ALTER TABLE public.guest_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert a guest score"
  ON public.guest_scores FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(display_name) BETWEEN 1 AND 40
    AND score >= 0 AND score <= 10000000
    AND (email IS NULL OR length(email) <= 200)
  );

CREATE POLICY "Anyone can read guest scores for leaderboard"
  ON public.guest_scores FOR SELECT
  TO anon, authenticated
  USING (true);
