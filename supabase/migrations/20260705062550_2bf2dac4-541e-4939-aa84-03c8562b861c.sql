REVOKE INSERT ON public.game_match_players FROM authenticated;
REVOKE UPDATE ON public.game_match_players FROM authenticated;
GRANT UPDATE (stars) ON public.game_match_players TO authenticated;

REVOKE UPDATE ON public.game_matches FROM authenticated;
GRANT UPDATE (status, started_at) ON public.game_matches TO authenticated;

DROP POLICY IF EXISTS "Host can update their own match" ON public.game_matches;
CREATE POLICY "Host can update their own match lifecycle"
ON public.game_matches
FOR UPDATE
TO authenticated
USING (host_id = auth.uid())
WITH CHECK (host_id = auth.uid() AND status IN ('lobby', 'playing', 'finished'));

DROP POLICY IF EXISTS "Users can update only their own row" ON public.game_match_players;
CREATE POLICY "Users can update only their own score"
ON public.game_match_players
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());