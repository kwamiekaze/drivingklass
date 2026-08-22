
CREATE OR REPLACE FUNCTION public.tmp_import_drivescout_leads(p_rows jsonb)
RETURNS TABLE (inserted bigint, updated bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH src AS (
    SELECT
      'drivescout_all_n_1:' || (r->>'source_index') AS import_key,
      (r->>'source_index')::int AS source_index,
      (r->>'source_page')::int AS source_page,
      nullif(r->>'start_date','')::date AS start_date,
      nullif(btrim(r->>'student_first_name'),'') AS sfn,
      nullif(btrim(r->>'student_last_name'),'') AS sln,
      nullif(btrim(r->>'student_phone'),'') AS sph,
      nullif(btrim(r->>'student_email'),'') AS sem,
      nullif(btrim(r->>'guardian_first_name'),'') AS gfn,
      nullif(btrim(r->>'guardian_last_name'),'') AS gln,
      nullif(btrim(r->>'guardian_phone'),'') AS gph,
      nullif(btrim(r->>'guardian_email'),'') AS gem
    FROM jsonb_array_elements(p_rows) AS r
  ), ins AS (
    INSERT INTO public.leads (
      import_key, import_source, source_index, source_page, start_date,
      student_first_name, student_last_name, phone, email, full_name,
      guardian_first_name, guardian_last_name, guardian_phone, guardian_email, guardian_name,
      lead_status, status
    )
    SELECT import_key, 'drivescout_all_n_1', source_index, source_page, start_date,
      sfn, sln, sph, sem, nullif(btrim(concat_ws(' ', sfn, sln)),''),
      gfn, gln, gph, gem, nullif(btrim(concat_ws(' ', gfn, gln)),''),
      'New', 'new'
    FROM src
    ON CONFLICT (import_key) WHERE import_key IS NOT NULL DO UPDATE SET
      source_index = EXCLUDED.source_index,
      source_page = EXCLUDED.source_page,
      start_date = EXCLUDED.start_date,
      student_first_name = EXCLUDED.student_first_name,
      student_last_name = EXCLUDED.student_last_name,
      phone = EXCLUDED.phone,
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      guardian_first_name = EXCLUDED.guardian_first_name,
      guardian_last_name = EXCLUDED.guardian_last_name,
      guardian_phone = EXCLUDED.guardian_phone,
      guardian_email = EXCLUDED.guardian_email,
      guardian_name = EXCLUDED.guardian_name,
      updated_at = now()
    RETURNING (xmax = 0) AS was_insert
  )
  SELECT count(*) FILTER (WHERE was_insert), count(*) FILTER (WHERE NOT was_insert) FROM ins;
END;
$$;

REVOKE ALL ON FUNCTION public.tmp_import_drivescout_leads(jsonb) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.tmp_import_drivescout_leads(jsonb) TO sandbox_exec';
  END IF;
END $$;
