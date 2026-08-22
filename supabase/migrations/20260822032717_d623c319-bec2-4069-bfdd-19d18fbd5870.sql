CREATE OR REPLACE FUNCTION public.admin_search_leads(
  p_search text DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_sort text DEFAULT 'source_index',
  p_dir text DEFAULT 'asc',
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
  lead_status text,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q text := nullif(btrim(coalesce(p_search, '')), '');
  v_sort text := lower(coalesce(p_sort, 'source_index'));
  v_dir text := CASE WHEN lower(coalesce(p_dir,'asc')) = 'desc' THEN 'desc' ELSE 'asc' END;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF v_sort NOT IN ('source_index','start_date','student_name','created_at') THEN
    v_sort := 'source_index';
  END IF;

  RETURN QUERY EXECUTE format($f$
    WITH filtered AS (
      SELECT l.* FROM public.leads l
      WHERE ($1 IS NULL OR (
              coalesce(l.full_name,'') || ' ' ||
              coalesce(l.student_first_name,'') || ' ' || coalesce(l.student_last_name,'') || ' ' ||
              coalesce(l.email,'') || ' ' || coalesce(l.phone,'') || ' ' ||
              coalesce(l.guardian_name,'') || ' ' ||
              coalesce(l.guardian_first_name,'') || ' ' || coalesce(l.guardian_last_name,'') || ' ' ||
              coalesce(l.guardian_email,'') || ' ' || coalesce(l.guardian_phone,'')
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
           f.start_date, f.source_page, f.source_index, f.import_source,
           f.lead_status, counted.c
    FROM filtered f CROSS JOIN counted
    ORDER BY %s %s NULLS LAST, f.created_at DESC
    LIMIT $3 OFFSET $4
  $f$,
    CASE v_sort
      WHEN 'start_date' THEN 'f.start_date'
      WHEN 'student_name' THEN 'lower(coalesce(f.student_first_name, f.full_name, ''''))'
      WHEN 'created_at' THEN 'f.created_at'
      ELSE 'f.source_index'
    END,
    v_dir
  )
  USING v_q, nullif(btrim(coalesce(p_source,'')), ''), greatest(1, least(coalesce(p_limit,50), 200)), greatest(0, coalesce(p_offset,0));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_search_leads(text, text, text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_search_leads(text, text, text, text, integer, integer) TO authenticated;

-- Server-side authorization self-test
CREATE OR REPLACE FUNCTION public.__test_admin_search_leads_auth()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := '98f12684-5bf8-44cf-a730-57489e1a324e';
  v_student_id uuid := '76987754-c835-40fb-a94f-96799196eb0b';
  v_instructor_id uuid := '73564bc6-d617-401e-a582-e0e02145a264';
  v_dummy_count bigint;
BEGIN
  -- Admin must succeed
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_admin_id::text)::text, true);
  SELECT count(*) INTO v_dummy_count FROM public.admin_search_leads();
  IF v_dummy_count IS NULL THEN
    RAISE EXCEPTION 'admin execution returned unexpected NULL';
  END IF;

  -- Student must be rejected
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_student_id::text)::text, true);
  BEGIN
    SELECT count(*) INTO v_dummy_count FROM public.admin_search_leads();
    RAISE EXCEPTION 'student was not rejected';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%not authorized%' THEN
      RAISE EXCEPTION 'student rejection failed with unexpected error: %', SQLERRM;
    END IF;
  END;

  -- Instructor must be rejected
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_instructor_id::text)::text, true);
  BEGIN
    SELECT count(*) INTO v_dummy_count FROM public.admin_search_leads();
    RAISE EXCEPTION 'instructor was not rejected';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%not authorized%' THEN
      RAISE EXCEPTION 'instructor rejection failed with unexpected error: %', SQLERRM;
    END IF;
  END;

  -- Anonymous (no sub claim) must be rejected
  PERFORM set_config('request.jwt.claims', '{}', true);
  BEGIN
    SELECT count(*) INTO v_dummy_count FROM public.admin_search_leads();
    RAISE EXCEPTION 'anonymous was not rejected';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%not authorized%' THEN
      RAISE EXCEPTION 'anonymous rejection failed with unexpected error: %', SQLERRM;
    END IF;
  END;

  -- Verify has_role correctly denies admin for user and staff roles without touching auth.users
  IF public.has_role(gen_random_uuid(), 'user') THEN
    RAISE EXCEPTION 'user role was unexpectedly granted admin access';
  END IF;
  IF public.has_role(gen_random_uuid(), 'staff') THEN
    RAISE EXCEPTION 'staff role was unexpectedly granted admin access';
  END IF;

  -- Verify the known admin has the role and known non-admins do not
  IF NOT public.has_role(v_admin_id, 'admin') THEN
    RAISE EXCEPTION 'admin user did not have admin role';
  END IF;
  IF public.has_role(v_student_id, 'admin') THEN
    RAISE EXCEPTION 'student user had admin role';
  END IF;
  IF public.has_role(v_instructor_id, 'admin') THEN
    RAISE EXCEPTION 'instructor user had admin role';
  END IF;
END;
$$;

SELECT public.__test_admin_search_leads_auth();
DROP FUNCTION public.__test_admin_search_leads_auth();