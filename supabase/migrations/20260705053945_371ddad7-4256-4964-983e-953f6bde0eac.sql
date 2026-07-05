-- game_matches: one row per multiplayer session
CREATE TABLE public.game_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'lobby',
  duration_s int NOT NULL DEFAULT 180,
  seed int NOT NULL,
  started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_matches TO authenticated;
GRANT ALL ON public.game_matches TO service_role;
ALTER TABLE public.game_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Any authenticated user can read matches"
  ON public.game_matches FOR SELECT TO authenticated USING (true);

CREATE POLICY "Host can create their own match"
  ON public.game_matches FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "Host can update their own match"
  ON public.game_matches FOR UPDATE TO authenticated
  USING (host_id = auth.uid()) WITH CHECK (host_id = auth.uid());

CREATE POLICY "Host can delete their own match"
  ON public.game_matches FOR DELETE TO authenticated
  USING (host_id = auth.uid());

-- game_match_players: one row per player per match
CREATE TABLE public.game_match_players (
  match_id uuid NOT NULL REFERENCES public.game_matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  color text NOT NULL DEFAULT 'gold',
  stars int NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_match_players TO authenticated;
GRANT ALL ON public.game_match_players TO service_role;
ALTER TABLE public.game_match_players ENABLE ROW LEVEL SECURITY;

-- Security-definer helper (avoids recursion in SELECT policy)
CREATE OR REPLACE FUNCTION public.is_match_player(_match_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.game_match_players
    WHERE match_id = _match_id AND user_id = _user_id
  );
$$;

CREATE POLICY "Players see rows for their matches"
  ON public.game_match_players FOR SELECT TO authenticated
  USING (public.is_match_player(match_id, auth.uid()));

CREATE POLICY "Users can insert only themselves"
  ON public.game_match_players FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update only their own row"
  ON public.game_match_players FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete only their own row"
  ON public.game_match_players FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_match_players;
