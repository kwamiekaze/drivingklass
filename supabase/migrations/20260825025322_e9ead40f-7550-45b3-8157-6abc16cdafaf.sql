-- 1. New source metadata columns
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS source_status text,
  ADD COLUMN IF NOT EXISTS source_location text,
  ADD COLUMN IF NOT EXISTS source_zone text,
  ADD COLUMN IF NOT EXISTS source_account_created_on date;

CREATE INDEX IF NOT EXISTS leads_source_account_created_idx ON public.leads (source_account_created_on);
CREATE INDEX IF NOT EXISTS leads_email_lower_idx ON public.leads (lower(email));

-- 2. Remove the cancelled marketing feature (no lead rows are touched)
DROP FUNCTION IF EXISTS public.admin_set_lead_consent(uuid[], text, text);
DROP TABLE IF EXISTS public.email_campaign_recipients CASCADE;
DROP TABLE IF EXISTS public.email_campaigns CASCADE;
DROP TABLE IF EXISTS public.marketing_settings CASCADE;
DROP INDEX IF EXISTS public.idx_leads_email_consent_status;

ALTER TABLE public.leads
  DROP COLUMN IF EXISTS email_consent_status,
  DROP COLUMN IF EXISTS email_consent_source,
  DROP COLUMN IF EXISTS email_consent_updated_at,
  DROP COLUMN IF EXISTS email_consent_updated_by;

-- 3. Rebuild admin_search_leads with the new fields + default ordering
DROP FUNCTION IF EXISTS public.admin_search_leads(text, text, text, text, integer, integer);

CREATE FUNCTION public.admin_search_leads(
  p_search text DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_sort text DEFAULT 'default',
  p_dir text DEFAULT 'desc',
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  full_name text,
  email text,
  phone text,
  student_first_name text,
  student_last_name text,
  guardian_name text,
  guardian_first_name text,
  guardian_last_name text,
  guardian_email text,
  guardian_phone text,
  start_date date,
  source_page integer,
  source_index integer,
  import_source text,
  import_key text,
  source_status text,
  source_location text,
  source_zone text,
  source_account_created_on date,
  lead_status text,
  notes text,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q text := nullif(btrim(coalesce(p_search, '')), '');
  v_sort text := lower(coalesce(p_sort, 'default'));
  v_dir text := CASE WHEN lower(coalesce(p_dir,'desc')) = 'asc' THEN 'asc' ELSE 'desc' END;
  v_order text;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF v_sort NOT IN ('default','source_index','start_date','student_name','created_at') THEN
    v_sort := 'default';
  END IF;

  v_order := CASE v_sort
    WHEN 'default' THEN format(
      'f.start_date %1$s NULLS LAST, f.source_account_created_on %1$s NULLS LAST, f.source_index asc NULLS LAST', v_dir)
    WHEN 'start_date' THEN format('f.start_date %s NULLS LAST', v_dir)
    WHEN 'student_name' THEN format('lower(coalesce(f.student_first_name, f.full_name, '''')) %s NULLS LAST', v_dir)
    WHEN 'created_at' THEN format('f.created_at %s NULLS LAST', v_dir)
    ELSE format('f.source_index %s NULLS LAST', v_dir)
  END;

  RETURN QUERY EXECUTE format($f$
    WITH filtered AS (
      SELECT l.* FROM public.leads l
      WHERE ($1 IS NULL OR (
              coalesce(l.full_name,'') || ' ' ||
              coalesce(l.student_first_name,'') || ' ' || coalesce(l.student_last_name,'') || ' ' ||
              coalesce(l.email,'') || ' ' || coalesce(l.phone,'') || ' ' ||
              coalesce(l.guardian_name,'') || ' ' ||
              coalesce(l.guardian_first_name,'') || ' ' || coalesce(l.guardian_last_name,'') || ' ' ||
              coalesce(l.guardian_email,'') || ' ' || coalesce(l.guardian_phone,'') || ' ' ||
              coalesce(l.source_location,'') || ' ' || coalesce(l.source_zone,'') || ' ' ||
              coalesce(l.source_status,'')
            ) ILIKE '%%' || $1 || '%%')
        AND ($2 IS NULL
             OR ($2 = 'imported' AND l.import_source IS NOT NULL)
             OR ($2 = 'manual' AND l.import_source IS NULL)
             OR (l.import_source = $2))
    ), counted AS (SELECT count(*) AS c FROM filtered)
    SELECT f.id, f.created_at, f.full_name, f.email, f.phone,
           f.student_first_name, f.student_last_name,
           f.guardian_name, f.guardian_first_name, f.guardian_last_name,
           f.guardian_email, f.guardian_phone,
           f.start_date, f.source_page, f.source_index, f.import_source, f.import_key,
           f.source_status, f.source_location, f.source_zone, f.source_account_created_on,
           f.lead_status, f.notes, counted.c
    FROM filtered f CROSS JOIN counted
    ORDER BY %s, f.created_at DESC
    LIMIT $3 OFFSET $4
  $f$, v_order)
  USING v_q, nullif(btrim(coalesce(p_source,'')), ''), greatest(1, least(coalesce(p_limit,50), 500)), greatest(0, coalesce(p_offset,0));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_search_leads(text, text, text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_search_leads(text, text, text, text, integer, integer) TO authenticated;

-- 4. Transactional, admin-only lead import apply function.
-- Each element of p_rows: { match_id (uuid|null), fields {...} }
CREATE OR REPLACE FUNCTION public.admin_apply_lead_import(p_rows jsonb)
RETURNS TABLE (row_number integer, lead_id uuid, action text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r jsonb;
  f jsonb;
  v_id uuid;
  v_match uuid;
  v_rownum integer;
  v_changed boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(coalesce(p_rows, '[]'::jsonb))
  LOOP
    f := r->'fields';
    v_rownum := nullif(r->>'row_number','')::integer;
    v_match := nullif(r->>'match_id','')::uuid;

    IF v_match IS NULL THEN
      INSERT INTO public.leads (
        created_by, student_first_name, student_last_name, full_name, email, phone,
        guardian_first_name, guardian_last_name, guardian_name, guardian_email, guardian_phone,
        start_date, source_page, source_index, import_source, import_key,
        source_status, source_location, source_zone, source_account_created_on
      ) VALUES (
        auth.uid(),
        nullif(f->>'student_first_name',''), nullif(f->>'student_last_name',''),
        nullif(btrim(coalesce(f->>'student_first_name','') || ' ' || coalesce(f->>'student_last_name','')),''),
        nullif(f->>'email',''), nullif(f->>'phone',''),
        nullif(f->>'guardian_first_name',''), nullif(f->>'guardian_last_name',''),
        nullif(btrim(coalesce(f->>'guardian_first_name','') || ' ' || coalesce(f->>'guardian_last_name','')),''),
        nullif(f->>'guardian_email',''), nullif(f->>'guardian_phone',''),
        nullif(f->>'start_date','')::date,
        nullif(f->>'source_page','')::integer, nullif(f->>'source_index','')::integer,
        nullif(f->>'import_source',''), nullif(f->>'import_key',''),
        nullif(f->>'source_status',''), nullif(f->>'source_location',''), nullif(f->>'source_zone',''),
        nullif(f->>'source_account_created_on','')::date
      )
      RETURNING leads.id INTO v_id;

      row_number := v_rownum; lead_id := v_id; action := 'inserted';
      RETURN NEXT;
    ELSE
      UPDATE public.leads l SET
        student_first_name = coalesce(nullif(f->>'student_first_name',''), l.student_first_name),
        student_last_name  = coalesce(nullif(f->>'student_last_name',''),  l.student_last_name),
        email              = coalesce(nullif(f->>'email',''),              l.email),
        phone              = coalesce(nullif(f->>'phone',''),              l.phone),
        guardian_first_name= coalesce(nullif(f->>'guardian_first_name',''),l.guardian_first_name),
        guardian_last_name = coalesce(nullif(f->>'guardian_last_name',''), l.guardian_last_name),
        guardian_email     = coalesce(nullif(f->>'guardian_email',''),     l.guardian_email),
        guardian_phone     = coalesce(nullif(f->>'guardian_phone',''),     l.guardian_phone),
        start_date         = coalesce(nullif(f->>'start_date','')::date,   l.start_date),
        source_page        = coalesce(nullif(f->>'source_page','')::integer, l.source_page),
        source_index       = coalesce(nullif(f->>'source_index','')::integer, l.source_index),
        import_source      = coalesce(nullif(f->>'import_source',''),      l.import_source),
        import_key         = coalesce(nullif(f->>'import_key',''),         l.import_key),
        source_status      = coalesce(nullif(f->>'source_status',''),      l.source_status),
        source_location    = coalesce(nullif(f->>'source_location',''),    l.source_location),
        source_zone        = coalesce(nullif(f->>'source_zone',''),        l.source_zone),
        source_account_created_on = coalesce(nullif(f->>'source_account_created_on','')::date, l.source_account_created_on),
        full_name = coalesce(
          nullif(btrim(coalesce(nullif(f->>'student_first_name',''), l.student_first_name, '') || ' ' ||
                       coalesce(nullif(f->>'student_last_name',''),  l.student_last_name, '')),''),
          l.full_name),
        guardian_name = coalesce(
          nullif(btrim(coalesce(nullif(f->>'guardian_first_name',''), l.guardian_first_name, '') || ' ' ||
                       coalesce(nullif(f->>'guardian_last_name',''),  l.guardian_last_name, '')),''),
          l.guardian_name),
        updated_at = now()
      WHERE l.id = v_match
      RETURNING (l.updated_at IS NOT NULL) INTO v_changed;

      row_number := v_rownum; lead_id := v_match; action := 'updated';
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_apply_lead_import(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_apply_lead_import(jsonb) TO authenticated;