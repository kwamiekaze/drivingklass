-- 1. account_links
CREATE TABLE public.account_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_user_id uuid NOT NULL,
  alias_user_id uuid NOT NULL UNIQUE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_links_no_self CHECK (canonical_user_id <> alias_user_id)
);

CREATE INDEX idx_account_links_canonical ON public.account_links(canonical_user_id);

GRANT SELECT ON public.account_links TO authenticated;
GRANT ALL ON public.account_links TO service_role;

ALTER TABLE public.account_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage account links"
  ON public.account_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Linked users can read their link"
  ON public.account_links FOR SELECT TO authenticated
  USING (alias_user_id = auth.uid() OR canonical_user_id = auth.uid());

-- 2. Guard rails: no chains, no cycles
CREATE OR REPLACE FUNCTION public.tg_account_links_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.account_links WHERE alias_user_id = NEW.canonical_user_id) THEN
    RAISE EXCEPTION 'Cannot link to an account that is itself a secondary account';
  END IF;
  IF EXISTS (SELECT 1 FROM public.account_links WHERE canonical_user_id = NEW.alias_user_id) THEN
    RAISE EXCEPTION 'That account already has its own secondary accounts and cannot become one';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_account_links_guard
BEFORE INSERT OR UPDATE ON public.account_links
FOR EACH ROW EXECUTE FUNCTION public.tg_account_links_guard();

-- 3. Resolver
CREATE OR REPLACE FUNCTION public.canonical_user_id(_uid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT al.canonical_user_id FROM public.account_links al WHERE al.alias_user_id = _uid),
    _uid
  );
$$;

CREATE OR REPLACE FUNCTION public.acting_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.canonical_user_id(auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.canonical_user_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.acting_user_id() TO authenticated, service_role;

-- 4. Rewrite ownership policies to resolve through the alias model.
DO $do$
DECLARE
  r record;
  v_targets text[][] := ARRAY[
    ARRAY['instructor_students','Students can view own assignment'],
    ARRAY['intake_drafts','Users manage own intake draft'],
    ARRAY['intake_form_revisions','Users can insert own intake revisions'],
    ARRAY['intake_form_revisions','Users can view own intake revisions'],
    ARRAY['notifications','Users can update own notifications'],
    ARRAY['notifications','Users can view own notifications'],
    ARRAY['permit_documents','Students can insert own permit documents'],
    ARRAY['permit_documents','Students can read own permit documents'],
    ARRAY['permit_documents','Students can update own permit documents'],
    ARRAY['permits','Users can insert own permits'],
    ARRAY['permits','Users can view own permits'],
    ARRAY['profiles','profiles_read_access'],
    ARRAY['proposal_edit_requests','Students can insert own edit requests'],
    ARRAY['proposal_edit_requests','Students can view own edit requests'],
    ARRAY['report_card_ratings','Users can update own ratings'],
    ARRAY['report_cards','Students can view own report cards'],
    ARRAY['road_test_results','Students can view own road test results'],
    ARRAY['schedule_proposal_items','Students can view items of own proposals'],
    ARRAY['schedule_proposals','Students can update own proposals for acceptance'],
    ARRAY['schedule_proposals','Students can view own proposals'],
    ARRAY['session_hour_deductions','Students can view own deductions'],
    ARRAY['session_location_updates','Student read own session location updates'],
    ARRAY['session_tracking','Student can view own tracking'],
    ARRAY['sessions','Participants can cancel own sessions'],
    ARRAY['sessions','Students can view own sessions'],
    ARRAY['student_schedule_shares','Students can view own schedule shares'],
    ARRAY['user_roles','Users can view own role']
  ];
  i int;
  v_table text;
  v_policy text;
  v_sql text;
BEGIN
  FOR i IN 1 .. array_length(v_targets, 1) LOOP
    v_table := v_targets[i][1];
    v_policy := v_targets[i][2];

    SELECT * INTO r FROM pg_policies
    WHERE schemaname = 'public' AND tablename = v_table AND policyname = v_policy;

    IF NOT FOUND THEN
      RAISE NOTICE 'skip missing policy %.%', v_table, v_policy;
      CONTINUE;
    END IF;

    v_sql := format('CREATE POLICY %I ON public.%I AS %s FOR %s TO %s',
      v_policy, v_table,
      CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
      r.cmd,
      array_to_string(r.roles, ', '));

    IF r.qual IS NOT NULL THEN
      v_sql := v_sql || format(' USING (%s)', replace(r.qual, 'auth.uid()', 'public.acting_user_id()'));
    END IF;
    IF r.with_check IS NOT NULL THEN
      v_sql := v_sql || format(' WITH CHECK (%s)', replace(r.with_check, 'auth.uid()', 'public.acting_user_id()'));
    END IF;

    EXECUTE format('DROP POLICY %I ON public.%I', v_policy, v_table);
    EXECUTE v_sql;
  END LOOP;
END
$do$;

-- 5. A secondary account must always be able to read its own raw profile row.
CREATE POLICY "profiles_read_own_raw_row"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

-- 6. Resolve the caller through the alias model in shared SECURITY DEFINER helpers.
CREATE OR REPLACE FUNCTION public.can_read_report_card(p_report_card_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rc record;
  v_uid uuid := public.acting_user_id();
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT id, student_id, instructor_id
  INTO rc
  FROM public.report_cards
  WHERE id = p_report_card_id;

  IF rc.id IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_staff_or_admin(v_uid) THEN
    RETURN true;
  END IF;

  RETURN (rc.student_id = v_uid) OR (rc.instructor_id = v_uid);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_sessions()
RETURNS TABLE(session_id uuid, starts_at timestamp with time zone, ends_at timestamp with time zone, duration_minutes integer, status text, student_id uuid, instructor_id uuid, student_name text, instructor_name text, student_email text, instructor_email text, note_for_student text, note_for_instructor text, cancellation_reason text, report_card_id uuid, completed boolean, completed_at timestamp with time zone, pickup_address text, dropoff_address text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    s.id as session_id,
    s.starts_at,
    s.ends_at,
    s.duration_minutes,
    s.status,
    s.student_id,
    s.instructor_id,
    COALESCE(NULLIF(TRIM(COALESCE(sp.first_name, '') || ' ' || COALESCE(sp.last_name, '')), ''), sp.full_name, sp.email, 'Student') as student_name,
    COALESCE(NULLIF(TRIM(COALESCE(ip.first_name, '') || ' ' || COALESCE(ip.last_name, '')), ''), ip.full_name, ip.email, 'Instructor') as instructor_name,
    sp.email as student_email,
    ip.email as instructor_email,
    s.note_for_student,
    s.note_for_instructor,
    s.cancellation_reason,
    s.report_card_id,
    s.completed,
    s.completed_at,
    sp.pickup_address as pickup_address,
    sp.dropoff_address as dropoff_address
  FROM public.sessions s
  LEFT JOIN public.profiles sp ON sp.id = s.student_id
  LEFT JOIN public.profiles ip ON ip.id = s.instructor_id
  WHERE s.student_id = public.acting_user_id()
     OR s.instructor_id = public.acting_user_id()
     OR public.is_staff_or_admin(public.acting_user_id())
  ORDER BY s.starts_at DESC;
$function$;