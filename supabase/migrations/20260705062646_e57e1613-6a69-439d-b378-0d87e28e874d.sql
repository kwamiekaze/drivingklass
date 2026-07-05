REVOKE INSERT ON public.game_matches FROM authenticated;
DROP POLICY IF EXISTS "Host can create their own match" ON public.game_matches;