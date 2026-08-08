-- 1. View log table
CREATE TABLE public.report_card_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_card_id uuid NOT NULL REFERENCES public.report_cards(id) ON DELETE CASCADE,
  viewer_user_id uuid NULL,
  viewer_type text NOT NULL CHECK (viewer_type IN ('student','public','instructor','admin','staff','unknown')),
  via text NOT NULL CHECK (via IN ('portal','public')),
  viewed_at timestamptz NOT NULL DEFAULT now(),
  user_agent text NULL
);

GRANT SELECT ON public.report_card_views TO authenticated;
GRANT ALL ON public.report_card_views TO service_role;

ALTER TABLE public.report_card_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and owning instructor can read view log"
ON public.report_card_views FOR SELECT TO authenticated
USING (
  public.is_staff_or_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.report_cards rc
    WHERE rc.id = report_card_views.report_card_id
      AND rc.instructor_id = auth.uid()
  )
);

CREATE INDEX idx_report_card_views_card_time
  ON public.report_card_views (report_card_id, viewed_at DESC);

-- 2. Rewritten marking RPC: logs EVERY view, resolves viewer type server-side
CREATE OR REPLACE FUNCTION public.mark_report_card_viewed(
  p_report_card_id uuid,
  p_via text DEFAULT 'student',
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rc record;
  v_uid uuid := auth.uid();
  v_claims_role text;
  v_is_service boolean := false;
  v_wants_public boolean := (COALESCE(p_via, 'student') = 'public');
  v_viewer_type text;
  v_via text;
BEGIN
  SELECT id, student_id, instructor_id, is_public
    INTO v_rc
  FROM public.report_cards
  WHERE id = p_report_card_id;

  IF v_rc.id IS NULL THEN RETURN; END IF;

  BEGIN
    v_claims_role := COALESCE(
      current_setting('request.jwt.claims', true)::jsonb ->> 'role',
      current_setting('request.jwt.claim.role', true)
    );
  EXCEPTION WHEN others THEN
    v_claims_role := NULL;
  END;
  v_is_service := (v_claims_role = 'service_role');

  IF v_wants_public THEN
    -- Public/access-code path: allowed for the service role (edge function) or
    -- an unauthenticated viewer of a card that is actually shared publicly.
    IF NOT v_is_service AND NOT (v_uid IS NULL AND COALESCE(v_rc.is_public, false)) THEN
      RETURN;
    END IF;
    v_viewer_type := 'public';
    v_via := 'public';
  ELSE
    IF v_uid IS NULL THEN RETURN; END IF;
    v_via := 'portal';
    IF v_uid = v_rc.student_id THEN
      v_viewer_type := 'student';
    ELSIF public.has_role(v_uid, 'admin'::public.app_role) THEN
      v_viewer_type := 'admin';
    ELSIF public.has_role(v_uid, 'staff'::public.app_role) THEN
      v_viewer_type := 'staff';
    ELSIF v_uid = v_rc.instructor_id OR public.has_role(v_uid, 'instructor'::public.app_role) THEN
      v_viewer_type := 'instructor';
    ELSE
      RETURN; -- unrelated user: do not log
    END IF;
  END IF;

  INSERT INTO public.report_card_views (report_card_id, viewer_user_id, viewer_type, via, user_agent)
  VALUES (p_report_card_id, v_uid, v_viewer_type, v_via, NULLIF(p_user_agent, ''));

  -- Staff/instructor previews never affect the viewed state or notifications
  IF v_viewer_type NOT IN ('student','public') THEN
    RETURN;
  END IF;

  UPDATE public.report_cards
  SET first_viewed_at = COALESCE(first_viewed_at, now()),
      last_viewed_at = now(),
      view_count = COALESCE(view_count, 0) + 1,
      first_viewed_via = COALESCE(first_viewed_via, CASE WHEN v_viewer_type = 'public' THEN 'public' ELSE 'student' END),
      last_viewed_via = CASE WHEN v_viewer_type = 'public' THEN 'public' ELSE 'student' END,
      student_view_count = student_view_count + CASE WHEN v_viewer_type = 'public' THEN 0 ELSE 1 END,
      public_view_count = public_view_count + CASE WHEN v_viewer_type = 'public' THEN 1 ELSE 0 END,
      student_first_viewed_at = CASE WHEN v_viewer_type = 'public' THEN student_first_viewed_at ELSE COALESCE(student_first_viewed_at, now()) END,
      student_last_viewed_at = CASE WHEN v_viewer_type = 'public' THEN student_last_viewed_at ELSE now() END,
      public_first_viewed_at = CASE WHEN v_viewer_type = 'public' THEN COALESCE(public_first_viewed_at, now()) ELSE public_first_viewed_at END,
      public_last_viewed_at = CASE WHEN v_viewer_type = 'public' THEN now() ELSE public_last_viewed_at END
  WHERE id = p_report_card_id;
END;
$$;

-- 3. Guard: never let an update clear the recorded view state
CREATE OR REPLACE FUNCTION public.tg_report_cards_preserve_view_state()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.first_viewed_at := COALESCE(NEW.first_viewed_at, OLD.first_viewed_at);
  NEW.first_viewed_via := COALESCE(NEW.first_viewed_via, OLD.first_viewed_via);
  NEW.last_viewed_at := COALESCE(NEW.last_viewed_at, OLD.last_viewed_at);
  NEW.last_viewed_via := COALESCE(NEW.last_viewed_via, OLD.last_viewed_via);
  NEW.student_first_viewed_at := COALESCE(NEW.student_first_viewed_at, OLD.student_first_viewed_at);
  NEW.student_last_viewed_at := COALESCE(NEW.student_last_viewed_at, OLD.student_last_viewed_at);
  NEW.public_first_viewed_at := COALESCE(NEW.public_first_viewed_at, OLD.public_first_viewed_at);
  NEW.public_last_viewed_at := COALESCE(NEW.public_last_viewed_at, OLD.public_last_viewed_at);
  NEW.view_count := GREATEST(COALESCE(NEW.view_count, 0), COALESCE(OLD.view_count, 0));
  NEW.student_view_count := GREATEST(COALESCE(NEW.student_view_count, 0), COALESCE(OLD.student_view_count, 0));
  NEW.public_view_count := GREATEST(COALESCE(NEW.public_view_count, 0), COALESCE(OLD.public_view_count, 0));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_report_cards_preserve_view_state ON public.report_cards;
CREATE TRIGGER trg_report_cards_preserve_view_state
BEFORE UPDATE ON public.report_cards
FOR EACH ROW EXECUTE FUNCTION public.tg_report_cards_preserve_view_state();

-- 4. Read API for instructors/admins
CREATE OR REPLACE FUNCTION public.get_report_card_view_log(p_report_card_id uuid)
RETURNS TABLE(
  viewer_type text,
  viewer_name text,
  via text,
  viewed_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_allowed boolean;
BEGIN
  SELECT public.is_staff_or_admin(v_uid)
      OR EXISTS (SELECT 1 FROM public.report_cards rc WHERE rc.id = p_report_card_id AND rc.instructor_id = v_uid)
    INTO v_allowed;
  IF NOT COALESCE(v_allowed, false) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT v.viewer_type,
         CASE
           WHEN v.viewer_type = 'public' THEN 'Public viewer via access code'
           ELSE COALESCE(
             NULLIF(TRIM(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'')), ''),
             p.full_name, p.email, 'Unknown viewer')
         END,
         v.via,
         v.viewed_at
  FROM public.report_card_views v
  LEFT JOIN public.profiles p ON p.id = v.viewer_user_id
  WHERE v.report_card_id = p_report_card_id
  ORDER BY v.viewed_at DESC
  LIMIT 50;
END;
$$;

-- 5. Backfill from existing evidence (no notifications: direct inserts only)
INSERT INTO public.report_card_views (report_card_id, viewer_user_id, viewer_type, via, viewed_at)
SELECT rc.id,
       CASE WHEN COALESCE(rc.first_viewed_via,'student') = 'public' THEN NULL ELSE rc.student_id END,
       CASE WHEN COALESCE(rc.first_viewed_via,'student') = 'public' THEN 'public' ELSE 'student' END,
       CASE WHEN COALESCE(rc.first_viewed_via,'student') = 'public' THEN 'public' ELSE 'portal' END,
       rc.first_viewed_at
FROM public.report_cards rc
WHERE rc.first_viewed_at IS NOT NULL;

-- Cards with star feedback but no recorded view: the feedback proves a view
WITH proof AS (
  SELECT r.report_card_id,
         MIN(r.created_at) AS first_at,
         BOOL_OR(COALESCE(r.is_public_view, false) OR r.submitted_by_role = 'public') AS was_public
  FROM public.report_card_ratings r
  JOIN public.report_cards rc ON rc.id = r.report_card_id
  WHERE rc.first_viewed_at IS NULL
  GROUP BY r.report_card_id
), ins AS (
  INSERT INTO public.report_card_views (report_card_id, viewer_user_id, viewer_type, via, viewed_at)
  SELECT p.report_card_id,
         CASE WHEN p.was_public THEN NULL ELSE rc.student_id END,
         CASE WHEN p.was_public THEN 'public' ELSE 'student' END,
         CASE WHEN p.was_public THEN 'public' ELSE 'portal' END,
         p.first_at
  FROM proof p JOIN public.report_cards rc ON rc.id = p.report_card_id
  RETURNING report_card_id
)
UPDATE public.report_cards rc
SET first_viewed_at = p.first_at,
    last_viewed_at = GREATEST(COALESCE(rc.last_viewed_at, p.first_at), p.first_at),
    first_viewed_via = CASE WHEN p.was_public THEN 'public' ELSE 'student' END,
    last_viewed_via = CASE WHEN p.was_public THEN 'public' ELSE 'student' END,
    view_count = GREATEST(COALESCE(rc.view_count,0), 1),
    student_view_count = rc.student_view_count + CASE WHEN p.was_public THEN 0 ELSE 1 END,
    public_view_count = rc.public_view_count + CASE WHEN p.was_public THEN 1 ELSE 0 END,
    student_first_viewed_at = CASE WHEN p.was_public THEN rc.student_first_viewed_at ELSE p.first_at END,
    student_last_viewed_at = CASE WHEN p.was_public THEN rc.student_last_viewed_at ELSE p.first_at END,
    public_first_viewed_at = CASE WHEN p.was_public THEN p.first_at ELSE rc.public_first_viewed_at END,
    public_last_viewed_at = CASE WHEN p.was_public THEN p.first_at ELSE rc.public_last_viewed_at END
FROM proof p
WHERE rc.id = p.report_card_id;