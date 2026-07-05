-- Add difficulty column and update unique constraint for per-user/level/difficulty personal bests
ALTER TABLE public.game_scores ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'learner';
ALTER TABLE public.game_scores ADD COLUMN IF NOT EXISTS distance integer;

-- Drop old unique constraint if it exists, add new one
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_scores_user_id_level_id_key'
  ) THEN
    ALTER TABLE public.game_scores DROP CONSTRAINT game_scores_user_id_level_id_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS game_scores_user_level_difficulty_key
  ON public.game_scores(user_id, level_id, difficulty);
