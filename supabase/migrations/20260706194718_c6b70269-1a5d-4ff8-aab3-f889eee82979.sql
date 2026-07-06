
-- ============================================================
-- session_tracking
-- ============================================================
CREATE TABLE public.session_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  instructor_id uuid NOT NULL,
  guardian_email text NOT NULL,
  tracking_token text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  update_interval_minutes int NOT NULL DEFAULT 30 CHECK (update_interval_minutes IN (15, 30, 60)),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  last_email_sent_at timestamptz,
  last_latitude numeric(9,6),
  last_longitude numeric(9,6),
  last_accuracy numeric(8,2),
  last_location_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_tracking_session ON public.session_tracking(session_id);
CREATE INDEX idx_session_tracking_active ON public.session_tracking(is_active) WHERE is_active = true;
CREATE INDEX idx_session_tracking_instructor ON public.session_tracking(instructor_id);
CREATE INDEX idx_session_tracking_student ON public.session_tracking(student_id);

GRANT SELECT, INSERT, UPDATE ON public.session_tracking TO authenticated;
GRANT ALL ON public.session_tracking TO service_role;

ALTER TABLE public.session_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/staff can manage all tracking"
  ON public.session_tracking FOR ALL
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Instructor can view own tracking"
  ON public.session_tracking FOR SELECT
  USING (instructor_id = auth.uid());

CREATE POLICY "Instructor can create tracking for own sessions"
  ON public.session_tracking FOR INSERT
  WITH CHECK (
    instructor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND s.instructor_id = auth.uid()
        AND s.status IN ('scheduled', 'in_progress')
    )
  );

CREATE POLICY "Instructor can update own tracking"
  ON public.session_tracking FOR UPDATE
  USING (instructor_id = auth.uid())
  WITH CHECK (instructor_id = auth.uid());

CREATE POLICY "Student can view own tracking"
  ON public.session_tracking FOR SELECT
  USING (student_id = auth.uid());

CREATE TRIGGER trg_session_tracking_updated_at
  BEFORE UPDATE ON public.session_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- session_location_updates
-- ============================================================
CREATE TABLE public.session_location_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id uuid NOT NULL REFERENCES public.session_tracking(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  latitude numeric(9,6) NOT NULL,
  longitude numeric(9,6) NOT NULL,
  accuracy numeric(8,2),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_location_updates_tracking ON public.session_location_updates(tracking_id, created_at DESC);

GRANT SELECT, INSERT ON public.session_location_updates TO authenticated;
GRANT ALL ON public.session_location_updates TO service_role;

ALTER TABLE public.session_location_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/staff read all location updates"
  ON public.session_location_updates FOR SELECT
  USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Instructor insert own active tracking locations"
  ON public.session_location_updates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.session_tracking t
      WHERE t.id = tracking_id
        AND t.instructor_id = auth.uid()
        AND t.is_active = true
    )
  );

CREATE POLICY "Instructor read own location updates"
  ON public.session_location_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.session_tracking t
      WHERE t.id = tracking_id AND t.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Student read own session location updates"
  ON public.session_location_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.session_tracking t
      WHERE t.id = tracking_id AND t.student_id = auth.uid()
    )
  );

-- ============================================================
-- Helper: record a new location ping and update tracking snapshot
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_tracking_location(
  p_tracking_id uuid,
  p_latitude numeric,
  p_longitude numeric,
  p_accuracy numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_track record;
BEGIN
  SELECT * INTO v_track FROM public.session_tracking WHERE id = p_tracking_id;
  IF v_track.id IS NULL THEN
    RAISE EXCEPTION 'Tracking session not found';
  END IF;
  IF NOT v_track.is_active THEN
    RAISE EXCEPTION 'Tracking is not active';
  END IF;
  IF v_track.instructor_id <> auth.uid() AND NOT public.is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.session_location_updates (tracking_id, session_id, latitude, longitude, accuracy)
  VALUES (p_tracking_id, v_track.session_id, p_latitude, p_longitude, p_accuracy);

  UPDATE public.session_tracking
     SET last_latitude = p_latitude,
         last_longitude = p_longitude,
         last_accuracy = p_accuracy,
         last_location_at = now()
   WHERE id = p_tracking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_tracking_location(uuid, numeric, numeric, numeric) TO authenticated;

-- ============================================================
-- Helper: public token lookup for guardian tracker page
-- Returns limited fields only; never exposes emails or full session details.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_public_tracking_by_token(p_token text)
RETURNS TABLE(
  tracking_id uuid,
  is_active boolean,
  update_interval_minutes int,
  started_at timestamptz,
  ended_at timestamptz,
  last_latitude numeric,
  last_longitude numeric,
  last_accuracy numeric,
  last_location_at timestamptz,
  student_first_name text,
  session_starts_at timestamptz,
  session_ends_at timestamptz,
  session_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id AS tracking_id,
    t.is_active,
    t.update_interval_minutes,
    t.started_at,
    t.ended_at,
    t.last_latitude,
    t.last_longitude,
    t.last_accuracy,
    t.last_location_at,
    COALESCE(NULLIF(sp.first_name, ''), split_part(COALESCE(sp.full_name, ''), ' ', 1), 'Student') AS student_first_name,
    s.starts_at AS session_starts_at,
    s.ends_at AS session_ends_at,
    s.status AS session_status
  FROM public.session_tracking t
  JOIN public.sessions s ON s.id = t.session_id
  LEFT JOIN public.profiles sp ON sp.id = t.student_id
  WHERE t.tracking_token = p_token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_tracking_by_token(text) TO anon, authenticated;

-- ============================================================
-- Auto-end tracking when parent session moves to completed/cancelled
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_session_end_stops_tracking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('completed', 'cancelled')
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.session_tracking
       SET is_active = false,
           ended_at = COALESCE(ended_at, now())
     WHERE session_id = NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_session_end_stops_tracking ON public.sessions;
CREATE TRIGGER trg_session_end_stops_tracking
  AFTER UPDATE OF status ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_session_end_stops_tracking();
