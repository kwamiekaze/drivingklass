-- 1) Remove the broken constraint that forces ends_at = starts_at + 30 minutes
ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS ends_at_30_min;

-- 2) Remove the 30-min snapping trigger so admins can schedule any time safely
DROP TRIGGER IF EXISTS trg_sessions_enforce_30min ON public.sessions;

-- 3) Ensure core columns exist + are normalized
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS created_by uuid NULL,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid NULL;

-- Add FKs to profiles(id) when missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sessions_created_by_fkey'
  ) THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sessions_cancelled_by_fkey'
  ) THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_cancelled_by_fkey
      FOREIGN KEY (cancelled_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Backfill + enforce NOT NULL where required
UPDATE public.sessions SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE public.sessions ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.sessions ALTER COLUMN created_at SET NOT NULL;

UPDATE public.sessions SET status = 'scheduled' WHERE status IS NULL;
ALTER TABLE public.sessions ALTER COLUMN status SET DEFAULT 'scheduled';
ALTER TABLE public.sessions ALTER COLUMN status SET NOT NULL;

UPDATE public.sessions
SET duration_minutes = GREATEST(1, (EXTRACT(EPOCH FROM (ends_at - starts_at))/60)::int)
WHERE duration_minutes IS NULL;
ALTER TABLE public.sessions ALTER COLUMN duration_minutes SET NOT NULL;

-- Normalize existing timestamps to minute precision (seconds = 00)
UPDATE public.sessions
SET starts_at = date_trunc('minute', starts_at),
    ends_at   = date_trunc('minute', ends_at);

-- 4) Safety net: ensure the current user always has a profile row
--    (avoids "pending approvals" mismatches caused by missing profiles)
CREATE OR REPLACE FUNCTION public.ensure_profile()
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _claims jsonb := COALESCE(current_setting('request.jwt.claims', true)::jsonb, '{}'::jsonb);
  _email text := _claims->>'email';
  _full_name text := (_claims->'user_metadata'->>'full_name');
  _profile public.profiles;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (_uid, _email, _full_name)
  ON CONFLICT (id) DO UPDATE
    SET email = COALESCE(public.profiles.email, EXCLUDED.email),
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

  SELECT * INTO _profile FROM public.profiles WHERE id = _uid;
  RETURN _profile;
END;
$$;

-- 5) Single-source-of-truth session creation for admins
CREATE OR REPLACE FUNCTION public.create_session_admin(
  _student_id uuid,
  _instructor_id uuid,
  _starts_at timestamptz,
  _duration_minutes int
)
RETURNS public.sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _starts_at_norm timestamptz;
  _ends_at_norm timestamptz;
  _session public.sessions;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.has_role(_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _duration_minutes IS NULL OR _duration_minutes <= 0 THEN
    RAISE EXCEPTION 'duration_minutes must be a positive integer';
  END IF;

  -- Validate student: approved profile + student role
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = _student_id
      AND p.approval_status = 'approved'
      AND ur.role = 'student'
  ) THEN
    RAISE EXCEPTION 'Invalid or unapproved student';
  END IF;

  -- Validate instructor: approved profile + instructor role
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = _instructor_id
      AND p.approval_status = 'approved'
      AND ur.role = 'instructor'
  ) THEN
    RAISE EXCEPTION 'Invalid or unapproved instructor';
  END IF;

  -- Normalize to minute precision (seconds = 00)
  _starts_at_norm := date_trunc('minute', _starts_at);
  _ends_at_norm := date_trunc('minute', _starts_at_norm + make_interval(mins => _duration_minutes));

  INSERT INTO public.sessions (
    student_id,
    instructor_id,
    starts_at,
    ends_at,
    duration_minutes,
    status,
    created_by
  ) VALUES (
    _student_id,
    _instructor_id,
    _starts_at_norm,
    _ends_at_norm,
    _duration_minutes,
    'scheduled',
    _uid
  )
  RETURNING * INTO _session;

  RETURN _session;
END;
$$;