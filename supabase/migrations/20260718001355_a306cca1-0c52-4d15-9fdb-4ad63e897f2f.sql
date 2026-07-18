
-- 1. Allow 'pending' status on sessions
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_status_check
  CHECK (status IN ('scheduled','cancelled','completed','pending'));

-- 2. Conflict check helper (used by UI pre-check)
CREATE OR REPLACE FUNCTION public.check_schedule_conflicts(
  _instructor_id uuid,
  _student_id uuid,
  _starts_at timestamptz,
  _ends_at timestamptz,
  _exclude_session_id uuid DEFAULT NULL,
  _exclude_block_id uuid DEFAULT NULL
)
RETURNS TABLE(kind text, id uuid, label text, starts_at timestamptz, ends_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 'session'::text,
         s.id,
         'Session (' || s.status || ') with ' ||
           COALESCE(NULLIF(TRIM(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'')), ''), p.full_name, p.email, 'student'),
         s.starts_at, s.ends_at
  FROM public.sessions s
  LEFT JOIN public.profiles p ON p.id = s.student_id
  WHERE s.status IN ('scheduled','pending')
    AND (_exclude_session_id IS NULL OR s.id <> _exclude_session_id)
    AND (
      (_instructor_id IS NOT NULL AND s.instructor_id = _instructor_id)
      OR (_student_id IS NOT NULL AND s.student_id = _student_id)
    )
    AND s.starts_at < _ends_at AND s.ends_at > _starts_at
  UNION ALL
  SELECT 'block'::text,
         b.id,
         COALESCE(NULLIF(b.title,''), 'Unavailable') ||
           CASE WHEN b.instructor_id IS NULL THEN ' (all instructors)' ELSE '' END,
         b.starts_at, b.ends_at
  FROM public.schedule_blocks b
  WHERE (_exclude_block_id IS NULL OR b.id <> _exclude_block_id)
    AND (
      b.instructor_id IS NULL
      OR (_instructor_id IS NOT NULL AND b.instructor_id = _instructor_id)
    )
    AND b.starts_at < _ends_at AND b.ends_at > _starts_at;
$$;

GRANT EXECUTE ON FUNCTION public.check_schedule_conflicts(uuid,uuid,timestamptz,timestamptz,uuid,uuid) TO authenticated, service_role;

-- 3. Hard trigger: reject overlapping sessions
CREATE OR REPLACE FUNCTION public.tg_sessions_prevent_overlap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _c record;
BEGIN
  IF NEW.status NOT IN ('scheduled','pending') THEN
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

DROP TRIGGER IF EXISTS sessions_prevent_overlap ON public.sessions;
CREATE TRIGGER sessions_prevent_overlap
BEFORE INSERT OR UPDATE OF starts_at, ends_at, instructor_id, student_id, status
ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.tg_sessions_prevent_overlap();

-- 4. Hard trigger: reject overlapping blocks
CREATE OR REPLACE FUNCTION public.tg_blocks_prevent_overlap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _c record;
BEGIN
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

DROP TRIGGER IF EXISTS blocks_prevent_overlap ON public.schedule_blocks;
CREATE TRIGGER blocks_prevent_overlap
BEFORE INSERT OR UPDATE OF starts_at, ends_at, instructor_id
ON public.schedule_blocks
FOR EACH ROW EXECUTE FUNCTION public.tg_blocks_prevent_overlap();

-- 5. Create pending session (admin/staff)
CREATE OR REPLACE FUNCTION public.create_pending_session_admin(
  _student_id uuid,
  _instructor_id uuid,
  _starts_at timestamptz,
  _duration_minutes integer
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
  IF _duration_minutes IS NULL OR _duration_minutes <= 0 THEN
    RAISE EXCEPTION 'duration_minutes must be a positive integer';
  END IF;

  _starts_at_norm := date_trunc('minute', _starts_at);
  _ends_at_norm := date_trunc('minute', _starts_at_norm + make_interval(mins => _duration_minutes));

  INSERT INTO public.sessions (
    student_id, instructor_id, starts_at, ends_at, duration_minutes, status, created_by
  ) VALUES (
    _student_id, _instructor_id, _starts_at_norm, _ends_at_norm, _duration_minutes, 'pending', _uid
  )
  RETURNING * INTO _session;

  RETURN _session;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_pending_session_admin(uuid,uuid,timestamptz,integer) TO authenticated, service_role;

-- 6. Approve pending session -> scheduled
CREATE OR REPLACE FUNCTION public.approve_pending_session(_session_id uuid)
RETURNS public.sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _session public.sessions;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_staff_or_admin(_uid) THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT * INTO _session FROM public.sessions WHERE id = _session_id FOR UPDATE;
  IF _session.id IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF _session.status <> 'pending' THEN
    RAISE EXCEPTION 'Session is not pending (current: %)', _session.status;
  END IF;

  UPDATE public.sessions
    SET status = 'scheduled'
    WHERE id = _session_id
    RETURNING * INTO _session;

  RETURN _session;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_pending_session(uuid) TO authenticated, service_role;
