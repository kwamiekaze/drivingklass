
-- Profile fields for game username + streak
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS game_username text,
  ADD COLUMN IF NOT EXISTS current_streak int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_streak int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_played_on date;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_game_username_lower_idx
  ON public.profiles (lower(game_username))
  WHERE game_username IS NOT NULL;

-- game_plays table
CREATE TABLE IF NOT EXISTS public.game_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level_id text NOT NULL,
  difficulty text NOT NULL,
  score int NOT NULL DEFAULT 0,
  grade text,
  stars int NOT NULL DEFAULT 0,
  distance int,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.game_plays TO authenticated;
GRANT ALL ON public.game_plays TO service_role;

ALTER TABLE public.game_plays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert their own plays"
  ON public.game_plays FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read their own plays"
  ON public.game_plays FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Staff read all plays"
  ON public.game_plays FOR SELECT TO authenticated
  USING (public.is_staff_or_admin(auth.uid()) OR public.has_role(auth.uid(), 'instructor'::public.app_role));

CREATE INDEX IF NOT EXISTS game_plays_user_created_idx
  ON public.game_plays (user_id, created_at DESC);

-- Streak update RPC
CREATE OR REPLACE FUNCTION public.record_game_streak()
RETURNS TABLE(current_streak int, best_streak int, last_played_on date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'America/New_York')::date;
  v_prev date;
  v_cur int;
  v_best int;
  v_new_cur int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.last_played_on, p.current_streak, p.best_streak
    INTO v_prev, v_cur, v_best
    FROM public.profiles p WHERE p.id = v_uid;

  IF v_prev = v_today THEN
    v_new_cur := COALESCE(v_cur, 0);
  ELSIF v_prev = v_today - 1 THEN
    v_new_cur := COALESCE(v_cur, 0) + 1;
  ELSE
    v_new_cur := 1;
  END IF;

  UPDATE public.profiles
    SET current_streak = v_new_cur,
        best_streak = GREATEST(COALESCE(v_best, 0), v_new_cur),
        last_played_on = v_today
    WHERE id = v_uid;

  RETURN QUERY
    SELECT p.current_streak, p.best_streak, p.last_played_on
      FROM public.profiles p WHERE p.id = v_uid;
END;
$$;

-- Username availability + set
CREATE OR REPLACE FUNCTION public.set_game_username(_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clean text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_clean := trim(_username);
  IF v_clean !~ '^[A-Za-z0-9_]{3,20}$' THEN
    RAISE EXCEPTION 'Username must be 3-20 letters, numbers, or underscores';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(game_username) = lower(v_clean) AND id <> v_uid) THEN
    RAISE EXCEPTION 'Username already taken';
  END IF;
  UPDATE public.profiles SET game_username = v_clean WHERE id = v_uid;
  RETURN v_clean;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_game_username_available(_username text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(game_username) = lower(trim(_username))
      AND (auth.uid() IS NULL OR id <> auth.uid())
  );
$$;
