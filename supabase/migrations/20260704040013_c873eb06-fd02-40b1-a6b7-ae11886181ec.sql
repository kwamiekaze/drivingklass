CREATE TABLE public.game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  level_id text NOT NULL,
  score integer NOT NULL,
  grade text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, level_id)
);

GRANT SELECT, INSERT, UPDATE ON public.game_scores TO authenticated;
GRANT ALL ON public.game_scores TO service_role;

ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read leaderboard"
  ON public.game_scores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users insert own scores"
  ON public.game_scores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own scores"
  ON public.game_scores FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX game_scores_level_score_idx ON public.game_scores (level_id, score DESC);
CREATE INDEX game_scores_user_idx ON public.game_scores (user_id);