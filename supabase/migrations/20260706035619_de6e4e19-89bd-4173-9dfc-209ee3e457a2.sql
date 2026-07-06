
-- Feedback table
CREATE TABLE public.game_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  category text NOT NULL,
  message text NOT NULL,
  rating int,
  email text,
  user_id uuid NULL
);

GRANT INSERT ON public.game_feedback TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.game_feedback TO authenticated;
GRANT ALL ON public.game_feedback TO service_role;

ALTER TABLE public.game_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit feedback"
  ON public.game_feedback FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all feedback"
  ON public.game_feedback FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Allow longer multiplayer match durations (up to 60 minutes)
CREATE OR REPLACE FUNCTION public.create_match(_duration_s integer)
 RETURNS game_matches
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF _duration_s IS NULL OR _duration_s < 60 OR _duration_s > 3600 OR (_duration_s % 30) <> 0 THEN
    RAISE EXCEPTION 'Duration must be between 60 and 3600 seconds in 30-second increments';
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
$function$;
