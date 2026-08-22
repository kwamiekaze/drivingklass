CREATE TABLE public.account_merge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  performed_by uuid,
  moved jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.account_merge_log TO authenticated;
GRANT ALL ON public.account_merge_log TO service_role;

ALTER TABLE public.account_merge_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read merge log"
  ON public.account_merge_log FOR SELECT TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.merge_student_account(
  p_source_user_id uuid,
  p_target_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_source public.profiles;
  v_target public.profiles;
  v_moved jsonb := '{}'::jsonb;
  v_n bigint;
BEGIN
  IF NOT public.has_role(v_actor, 'admin') THEN
    RAISE EXCEPTION 'Only admins can merge accounts';
  END IF;
  IF p_source_user_id IS NULL OR p_target_user_id IS NULL OR p_source_user_id = p_target_user_id THEN
    RAISE EXCEPTION 'Source and target must be two different accounts';
  END IF;

  SELECT * INTO v_source FROM public.profiles WHERE id = p_source_user_id;
  SELECT * INTO v_target FROM public.profiles WHERE id = p_target_user_id;
  IF v_source.id IS NULL OR v_target.id IS NULL THEN
    RAISE EXCEPTION 'Both accounts must exist';
  END IF;

  -- Idempotency: already merged away
  IF EXISTS (SELECT 1 FROM public.account_links WHERE alias_user_id = p_source_user_id) THEN
    IF EXISTS (SELECT 1 FROM public.account_links
               WHERE alias_user_id = p_source_user_id AND canonical_user_id = p_target_user_id) THEN
      RETURN jsonb_build_object('ok', true, 'already_merged', true);
    END IF;
    RAISE EXCEPTION 'This account is already linked to a different account';
  END IF;

  IF COALESCE(v_source.approval_status, 'pending') <> 'pending' THEN
    RAISE EXCEPTION 'Only a pending account can be merged (source status is %)', COALESCE(v_source.approval_status, 'unknown');
  END IF;
  IF COALESCE(v_target.approval_status, 'pending') <> 'approved' THEN
    RAISE EXCEPTION 'The target account must be approved';
  END IF;
  IF EXISTS (SELECT 1 FROM public.account_links WHERE canonical_user_id = p_source_user_id) THEN
    RAISE EXCEPTION 'The pending account has its own secondary logins; remove them first';
  END IF;
  IF EXISTS (SELECT 1 FROM public.account_links WHERE alias_user_id = p_target_user_id) THEN
    RAISE EXCEPTION 'The target account is itself a secondary login';
  END IF;

  UPDATE public.sessions SET student_id = p_target_user_id WHERE student_id = p_source_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved || jsonb_build_object('sessions', v_n);

  UPDATE public.report_cards SET student_id = p_target_user_id WHERE student_id = p_source_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved || jsonb_build_object('report_cards', v_n);

  UPDATE public.report_card_ratings r SET student_id = p_target_user_id
   WHERE r.student_id = p_source_user_id
     AND NOT EXISTS (SELECT 1 FROM public.report_card_ratings x
                      WHERE x.report_card_id = r.report_card_id AND x.student_id = p_target_user_id);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved || jsonb_build_object('report_card_ratings', v_n);

  UPDATE public.road_test_results SET student_id = p_target_user_id WHERE student_id = p_source_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved || jsonb_build_object('road_test_results', v_n);

  UPDATE public.session_tracking SET student_id = p_target_user_id WHERE student_id = p_source_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved || jsonb_build_object('session_tracking', v_n);

  UPDATE public.session_hour_deductions SET student_id = p_target_user_id WHERE student_id = p_source_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved || jsonb_build_object('session_hour_deductions', v_n);

  UPDATE public.schedule_proposals SET student_id = p_target_user_id WHERE student_id = p_source_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved || jsonb_build_object('schedule_proposals', v_n);

  UPDATE public.proposal_edit_requests SET student_id = p_target_user_id WHERE student_id = p_source_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved || jsonb_build_object('proposal_edit_requests', v_n);

  UPDATE public.instructor_students i SET student_id = p_target_user_id
   WHERE i.student_id = p_source_user_id
     AND NOT EXISTS (SELECT 1 FROM public.instructor_students x
                      WHERE x.instructor_id = i.instructor_id AND x.student_id = p_target_user_id);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved || jsonb_build_object('instructor_students', v_n);

  UPDATE public.permits SET user_id = p_target_user_id WHERE user_id = p_source_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved || jsonb_build_object('permits', v_n);

  UPDATE public.permit_documents SET student_id = p_target_user_id WHERE student_id = p_source_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved || jsonb_build_object('permit_documents', v_n);

  UPDATE public.intake_form_revisions SET user_id = p_target_user_id WHERE user_id = p_source_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved || jsonb_build_object('intake_form_revisions', v_n);

  UPDATE public.approved_intakes SET user_id = p_target_user_id WHERE user_id = p_source_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved || jsonb_build_object('approved_intakes', v_n);

  -- Drafts key on user_id; only move when the target has none.
  UPDATE public.intake_drafts d SET user_id = p_target_user_id
   WHERE d.user_id = p_source_user_id
     AND NOT EXISTS (SELECT 1 FROM public.intake_drafts x WHERE x.user_id = p_target_user_id);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved || jsonb_build_object('intake_drafts', v_n);

  UPDATE public.notifications SET user_id = p_target_user_id WHERE user_id = p_source_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved || jsonb_build_object('notifications', v_n);

  UPDATE public.map_pins SET student_id = p_target_user_id WHERE student_id = p_source_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved || jsonb_build_object('map_pins', v_n);

  UPDATE public.student_schedule_shares SET student_id = p_target_user_id WHERE student_id = p_source_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved || jsonb_build_object('student_schedule_shares', v_n);

  UPDATE public.health_issues SET student_id = p_target_user_id WHERE student_id = p_source_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved || jsonb_build_object('health_issues', v_n);

  UPDATE public.internal_notes SET target_user_id = p_target_user_id WHERE target_user_id = p_source_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved || jsonb_build_object('internal_notes', v_n);

  UPDATE public.report_card_feedback SET sender_user_id = p_target_user_id WHERE sender_user_id = p_source_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved || jsonb_build_object('report_card_feedback', v_n);

  UPDATE public.leads SET converted_student_id = p_target_user_id WHERE converted_student_id = p_source_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved || jsonb_build_object('leads', v_n);

  -- Fill only-missing intake details on the target from the source.
  UPDATE public.profiles t SET
    phone = COALESCE(NULLIF(t.phone, ''), v_source.phone),
    pickup_address = COALESCE(NULLIF(t.pickup_address, ''), v_source.pickup_address),
    dropoff_address = COALESCE(NULLIF(t.dropoff_address, ''), v_source.dropoff_address),
    permit_number = COALESCE(NULLIF(t.permit_number, ''), v_source.permit_number),
    permit_issue_date = COALESCE(t.permit_issue_date, v_source.permit_issue_date),
    permit_expiration_date = COALESCE(t.permit_expiration_date, v_source.permit_expiration_date),
    guardian_name = COALESCE(NULLIF(t.guardian_name, ''), v_source.guardian_name),
    guardian_phone = COALESCE(NULLIF(t.guardian_phone, ''), v_source.guardian_phone),
    guardian_email = COALESCE(NULLIF(t.guardian_email, ''), v_source.guardian_email),
    permit_file_url = COALESCE(NULLIF(t.permit_file_url, ''), v_source.permit_file_url),
    first_name = COALESCE(NULLIF(t.first_name, ''), v_source.first_name),
    last_name = COALESCE(NULLIF(t.last_name, ''), v_source.last_name),
    availability_days = COALESCE(t.availability_days, v_source.availability_days),
    availability_windows = COALESCE(t.availability_windows, v_source.availability_windows),
    availability_notes = COALESCE(NULLIF(t.availability_notes, ''), v_source.availability_notes),
    purchased_hours = COALESCE(t.purchased_hours, 0) + COALESCE(v_source.purchased_hours, 0),
    intake_submitted = COALESCE(t.intake_submitted, false) OR COALESCE(v_source.intake_submitted, false),
    updated_at = now()
  WHERE t.id = p_target_user_id;

  -- Recompute hours from the moved records (no double counting).
  UPDATE public.profiles
     SET hours_completed = public.compute_completed_hours(p_target_user_id),
         hours_remaining = public.compute_remaining_hours(p_target_user_id),
         updated_at = now()
   WHERE id = p_target_user_id;

  -- Neutralise the source account and keep its email working as a secondary login.
  UPDATE public.profiles
     SET purchased_hours = 0,
         hours_completed = 0,
         hours_remaining = 0,
         approval_status = 'merged',
         updated_at = now()
   WHERE id = p_source_user_id;

  INSERT INTO public.account_links (canonical_user_id, alias_user_id, created_by)
  VALUES (p_target_user_id, p_source_user_id, v_actor);

  INSERT INTO public.account_merge_log (source_user_id, target_user_id, performed_by, moved)
  VALUES (p_source_user_id, p_target_user_id, v_actor, v_moved);

  RETURN jsonb_build_object('ok', true, 'moved', v_moved);
END;
$$;

REVOKE ALL ON FUNCTION public.merge_student_account(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_student_account(uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.canonical_user_id(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.acting_user_id() FROM anon;