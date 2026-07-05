-- ============================================================================
-- Multiplayer: public lobby list + atomic-join RPC
-- ============================================================================

-- List of open matches (status='lobby', <5 players) for the public "join" screen.
CREATE OR REPLACE FUNCTION public.list_public_matches()
RETURNS TABLE (
  id uuid,
  code text,
  host_id uuid,
  host_name text,
  status text,
  duration_s int,
  player_count int,
  seats_left int,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id,
    m.code,
    m.host_id,
    COALESCE(
      NULLIF(TRIM(COALESCE(hp.first_name,'') || ' ' || COALESCE(hp.last_name,'')), ''),
      hp.full_name,
      hp.email,
      'Host'
    ) AS host_name,
    m.status,
    m.duration_s,
    COALESCE(pc.n, 0)::int AS player_count,
    GREATEST(0, 5 - COALESCE(pc.n, 0))::int AS seats_left,
    m.created_at
  FROM public.game_matches m
  LEFT JOIN public.profiles hp ON hp.id = m.host_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS n
    FROM public.game_match_players gmp
    WHERE gmp.match_id = m.id
  ) pc ON true
  WHERE m.status = 'lobby'
    AND COALESCE(pc.n, 0) < 5
    AND m.created_at > now() - interval '30 minutes'
  ORDER BY m.created_at DESC
  LIMIT 25;
$$;

GRANT EXECUTE ON FUNCTION public.list_public_matches() TO authenticated;

-- Atomic join by 4-char code. Locks the match row, re-checks status + seat
-- count, picks an unused color, inserts the player row, and returns match id.
CREATE OR REPLACE FUNCTION public.join_open_match(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _match public.game_matches;
  _count int;
  _taken text[];
  _all text[] := ARRAY['gold','red','blue','green','purple'];
  _color text;
  _profile record;
  _name text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Locate match by code (case-insensitive) and lock it against concurrent joins
  SELECT * INTO _match
  FROM public.game_matches
  WHERE upper(code) = upper(_code)
  FOR UPDATE;

  IF _match.id IS NULL THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  IF _match.status <> 'lobby' THEN
    RAISE EXCEPTION 'Match already started';
  END IF;

  -- If already joined, just return match id (idempotent)
  IF EXISTS (
    SELECT 1 FROM public.game_match_players
    WHERE match_id = _match.id AND user_id = _uid
  ) THEN
    RETURN _match.id;
  END IF;

  SELECT COUNT(*)::int INTO _count
  FROM public.game_match_players
  WHERE match_id = _match.id;

  IF _count >= 5 THEN
    RAISE EXCEPTION 'Match is full';
  END IF;

  -- Pick the first unused color
  SELECT COALESCE(array_agg(color::text), ARRAY[]::text[]) INTO _taken
  FROM public.game_match_players
  WHERE match_id = _match.id;

  SELECT c INTO _color
  FROM unnest(_all) AS c
  WHERE NOT (c = ANY(_taken))
  LIMIT 1;

  IF _color IS NULL THEN
    _color := 'gold';
  END IF;

  -- Compose display name from profile
  SELECT first_name, last_name, full_name, email
  INTO _profile
  FROM public.profiles WHERE id = _uid;

  _name := COALESCE(
    NULLIF(TRIM(COALESCE(_profile.first_name,'') || ' ' || COALESCE(_profile.last_name,'')), ''),
    _profile.full_name,
    split_part(_profile.email, '@', 1),
    'Driver'
  );

  INSERT INTO public.game_match_players (match_id, user_id, display_name, color, stars)
  VALUES (_match.id, _uid, _name, _color, 0);

  RETURN _match.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_open_match(text) TO authenticated;
