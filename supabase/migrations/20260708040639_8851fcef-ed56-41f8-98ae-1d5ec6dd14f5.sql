
-- Additive: new table for public leaderboards (daily challenge + endless).
-- Existing game_scores (personal bests) is untouched.
CREATE TABLE IF NOT EXISTS public.game_leaderboard_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NULL,
  player_name text NOT NULL,
  mode text NOT NULL,               -- 'daily' | 'endless'
  level_id text NOT NULL,
  score integer NOT NULL CHECK (score >= 0 AND score <= 10000000),
  day date NULL,
  rank_tier text NULL,
  CONSTRAINT player_name_len CHECK (char_length(player_name) BETWEEN 1 AND 20),
  CONSTRAINT mode_valid CHECK (mode IN ('daily','endless'))
);

CREATE INDEX IF NOT EXISTS idx_gle_mode_day_score ON public.game_leaderboard_entries (mode, day, score DESC);
CREATE INDEX IF NOT EXISTS idx_gle_mode_created ON public.game_leaderboard_entries (mode, created_at DESC);

GRANT SELECT, INSERT ON public.game_leaderboard_entries TO anon, authenticated;
GRANT ALL ON public.game_leaderboard_entries TO service_role;

ALTER TABLE public.game_leaderboard_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read leaderboard entries"
  ON public.game_leaderboard_entries FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert a leaderboard entry"
  ON public.game_leaderboard_entries FOR INSERT
  WITH CHECK (
    char_length(player_name) BETWEEN 1 AND 20
    AND score BETWEEN 0 AND 10000000
    AND mode IN ('daily','endless')
  );
