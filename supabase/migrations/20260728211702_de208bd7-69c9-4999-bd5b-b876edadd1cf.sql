
-- 1. Additive audit columns
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS conflict_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS overridden_by uuid,
  ADD COLUMN IF NOT EXISTS overridden_at timestamptz;

ALTER TABLE public.schedule_blocks
  ADD COLUMN IF NOT EXISTS conflict_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS overridden_by uuid,
  ADD COLUMN IF NOT EXISTS overridden_at timestamptz;

-- 2. Session overlap trigger with admin override gate
CREATE OR REPLACE FUNCTION public.tg_sessions_prevent_overlap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _c record;
  _uid uuid := auth.uid();
  _is_admin boolean := false;
BEGIN
  IF NEW.status NOT IN ('scheduled','pending') THEN
    RETURN NEW;
  END IF;

  IF NEW.conflict_override IS TRUE THEN
    IF _uid IS NULL THEN
      RAISE EXCEPTION 'conflict_override requires an authenticated admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    _is_admin := public.has_role(_uid, 'admin'::public.app_role);
    IF NOT _is_admin THEN
      RAISE EXCEPTION 'Only admins can override schedule conflicts'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    -- Stamp audit fields when the flag flips on
    IF (TG_OP = 'INSERT')
       OR (OLD.conflict_override IS DISTINCT FROM NEW.conflict_override) THEN
      NEW.overridden_by := _uid;
      NEW.overridden_at := now();
    END IF;
    RETURN NEW;
  END IF;

  SELECT * INTO _c FROM public.check_schedule_conflicts(
    NEW.instructor_id, NEW.student_id, NEW.starts_at, NEW.ends_at, NEW.id, NULL
  ) LIMIT 1;
  IF _c.id IS NOT NULL THEN
    RAISE EXCEPTION 'Schedule conflict: % from % to %',
      _c.label,
      to_char(_c.starts_at AT TIME ZONE 'America/New_York', 'Mon DD HH12:MI AM'),
      to_char(_c.ends_at AT TIME ZONE 'America/New_York', 'HH12:MI AM')
      USING ERRCODE = 'exclusion_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Block overlap trigger with admin override gate
CREATE OR REPLACE FUNCTION public.tg_blocks_prevent_overlap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _c record;
  _uid uuid := auth.uid();
  _is_admin boolean := false;
BEGIN
  IF NEW.conflict_override IS TRUE THEN
    IF _uid IS NULL THEN
      RAISE EXCEPTION 'conflict_override requires an authenticated admin'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    _is_admin := public.has_role(_uid, 'admin'::public.app_role);
    IF NOT _is_admin THEN
      RAISE EXCEPTION 'Only admins can override schedule conflicts'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF (TG_OP = 'INSERT')
       OR (OLD.conflict_override IS DISTINCT FROM NEW.conflict_override) THEN
      NEW.overridden_by := _uid;
      NEW.overridden_at := now();
    END IF;
    RETURN NEW;
  END IF;

  -- Overlap with active sessions
  SELECT s.id AS id, s.starts_at, s.ends_at INTO _c
  FROM public.sessions s
  WHERE s.status IN ('scheduled','pending')
    AND (NEW.instructor_id IS NULL OR s.instructor_id = NEW.instructor_id)
    AND s.starts_at < NEW.ends_at AND s.ends_at > NEW.starts_at
  LIMIT 1;
  IF _c.id IS NOT NULL THEN
    RAISE EXCEPTION 'Schedule conflict with existing session (% - %)',
      to_char(_c.starts_at AT TIME ZONE 'America/New_York', 'Mon DD HH12:MI AM'),
      to_char(_c.ends_at AT TIME ZONE 'America/New_York', 'HH12:MI AM')
      USING ERRCODE = 'exclusion_violation';
  END IF;
  -- Overlap with other blocks
  SELECT b.id, b.starts_at, b.ends_at INTO _c
  FROM public.schedule_blocks b
  WHERE b.id <> NEW.id
    AND (
      NEW.instructor_id IS NULL
      OR b.instructor_id IS NULL
      OR b.instructor_id = NEW.instructor_id
    )
    AND b.starts_at < NEW.ends_at AND b.ends_at > NEW.starts_at
  LIMIT 1;
  IF _c.id IS NOT NULL THEN
    RAISE EXCEPTION 'Schedule conflict with existing block (% - %)',
      to_char(_c.starts_at AT TIME ZONE 'America/New_York', 'Mon DD HH12:MI AM'),
      to_char(_c.ends_at AT TIME ZONE 'America/New_York', 'HH12:MI AM')
      USING ERRCODE = 'exclusion_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- Ensure trigger also fires when conflict_override or overridden_* change
DROP TRIGGER IF EXISTS sessions_prevent_overlap ON public.sessions;
CREATE TRIGGER sessions_prevent_overlap
BEFORE INSERT OR UPDATE OF starts_at, ends_at, instructor_id, student_id, status, conflict_override
ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.tg_sessions_prevent_overlap();

DROP TRIGGER IF EXISTS blocks_prevent_overlap ON public.schedule_blocks;
CREATE TRIGGER blocks_prevent_overlap
BEFORE INSERT OR UPDATE OF starts_at, ends_at, instructor_id, conflict_override
ON public.schedule_blocks
FOR EACH ROW EXECUTE FUNCTION public.tg_blocks_prevent_overlap();

-- 4. Admin-only overloads that accept an explicit override flag
CREATE OR REPLACE FUNCTION public.create_session_admin(
  _student_id uuid,
  _instructor_id uuid,
  _starts_at timestamptz,
  _duration_minutes int,
  _override_conflicts boolean
)
RETURNS public.sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _starts_at_norm timestamptz;
  _ends_at_norm timestamptz;
  _session public.sessions;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _duration_minutes IS NULL OR _duration_minutes <= 0 THEN
    RAISE EXCEPTION 'duration_minutes must be a positive integer';
  END IF;

  _starts_at_norm := date_trunc('minute', _starts_at);
  _ends_at_norm := date_trunc('minute', _starts_at_norm + make_interval(mins => _duration_minutes));

  INSERT INTO public.sessions (
    student_id, instructor_id, starts_at, ends_at, duration_minutes, status, created_by,
    conflict_override
  ) VALUES (
    _student_id, _instructor_id, _starts_at_norm, _ends_at_norm, _duration_minutes, 'scheduled', _uid,
    COALESCE(_override_conflicts, false)
  )
  RETURNING * INTO _session;

  RETURN _session;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_session_admin(uuid,uuid,timestamptz,int,boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_pending_session_admin(
  _student_id uuid,
  _instructor_id uuid,
  _starts_at timestamptz,
  _duration_minutes int,
  _override_conflicts boolean
)
RETURNS public.sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _starts_at_norm timestamptz;
  _ends_at_norm timestamptz;
  _session public.sessions;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_staff_or_admin(_uid) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _override_conflicts IS TRUE AND NOT public.has_role(_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can override schedule conflicts'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF _duration_minutes IS NULL OR _duration_minutes <= 0 THEN
    RAISE EXCEPTION 'duration_minutes must be a positive integer';
  END IF;

  _starts_at_norm := date_trunc('minute', _starts_at);
  _ends_at_norm := date_trunc('minute', _starts_at_norm + make_interval(mins => _duration_minutes));

  INSERT INTO public.sessions (
    student_id, instructor_id, starts_at, ends_at, duration_minutes, status, created_by,
    conflict_override
  ) VALUES (
    _student_id, _instructor_id, _starts_at_norm, _ends_at_norm, _duration_minutes, 'pending', _uid,
    COALESCE(_override_conflicts, false)
  )
  RETURNING * INTO _session;

  RETURN _session;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_pending_session_admin(uuid,uuid,timestamptz,int,boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.approve_pending_session(
  _session_id uuid,
  _override_conflicts boolean
)
RETURNS public.sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _session public.sessions;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_staff_or_admin(_uid) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _override_conflicts IS TRUE AND NOT public.has_role(_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can override schedule conflicts'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO _session FROM public.sessions WHERE id = _session_id FOR UPDATE;
  IF _session.id IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF _session.status <> 'pending' THEN
    RAISE EXCEPTION 'Session is not pending (current: %)', _session.status;
  END IF;

  IF _override_conflicts IS TRUE THEN
    UPDATE public.sessions
      SET status = 'scheduled', conflict_override = true
      WHERE id = _session_id
      RETURNING * INTO _session;
  ELSE
    UPDATE public.sessions
      SET status = 'scheduled'
      WHERE id = _session_id
      RETURNING * INTO _session;
  END IF;

  RETURN _session;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_pending_session(uuid, boolean) TO authenticated, service_role;
