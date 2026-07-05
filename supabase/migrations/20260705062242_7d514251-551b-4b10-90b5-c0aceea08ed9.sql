CREATE OR REPLACE FUNCTION public.create_match(_duration_s integer)
RETURNS public.game_matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _profile record;
  _name text;
  _code text;
  _match public.game_matches;
  _attempt integer := 0;
  _alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _duration_s IS NULL OR _duration_s < 60 OR _duration_s > 600 OR (_duration_s % 30) <> 0 THEN
    RAISE EXCEPTION 'Duration must be between 60 and 600 seconds in 30-second increments';
  END IF;

  SELECT first_name, last_name, full_name, email
  INTO _profile
  FROM public.profiles
  WHERE id = _uid;

  _name := COALESCE(
    NULLIF(TRIM(COALESCE(_profile.first_name,'') || ' ' || COALESCE(_profile.last_name,'')), ''),
    _profile.full_name,
    split_part(_profile.email, '@', 1),
    'Driver'
  );

  LOOP
    _attempt := _attempt + 1;
    _code := '';
    FOR i IN 1..4 LOOP
      _code := _code || substr(_alphabet, 1 + floor(random() * length(_alphabet))::integer, 1);
    END LOOP;

    BEGIN
      INSERT INTO public.game_matches (code, host_id, status, duration_s, seed)
      VALUES (_code, _uid, 'lobby', _duration_s, floor(random() * 2000000000)::integer)
      RETURNING * INTO _match;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF _attempt >= 8 THEN
        RAISE EXCEPTION 'Could not generate a unique room code';
      END IF;
    END;
  END LOOP;

  INSERT INTO public.game_match_players (match_id, user_id, display_name, color, stars)
  VALUES (_match.id, _uid, _name, 'gold', 0);

  RETURN _match;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_match(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_match(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.restart_match(_match_id uuid)
RETURNS public.game_matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _match public.game_matches;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _match
  FROM public.game_matches
  WHERE id = _match_id
  FOR UPDATE;

  IF _match.id IS NULL THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF _match.host_id <> _uid THEN
    RAISE EXCEPTION 'Only the host can restart this match';
  END IF;

  UPDATE public.game_match_players
  SET stars = 0
  WHERE match_id = _match_id;

  UPDATE public.game_matches
  SET status = 'playing',
      seed = floor(random() * 2000000000)::integer,
      started_at = now()
  WHERE id = _match_id
  RETURNING * INTO _match;

  RETURN _match;
END;
$$;

GRANT EXECUTE ON FUNCTION public.restart_match(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restart_match(uuid) TO service_role;

DROP POLICY IF EXISTS "Users can insert only themselves" ON public.game_match_players;

-- Player rows are created only by create_match() and join_open_match() so users cannot bypass lobby capacity/status checks.
