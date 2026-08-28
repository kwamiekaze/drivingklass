-- 1. Duplicate protection on imported rows -------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS leads_import_source_key_uniq
  ON public.leads (lower(btrim(import_source)), lower(btrim(import_key)))
  WHERE import_source IS NOT NULL AND btrim(import_source) <> ''
    AND import_key IS NOT NULL AND btrim(import_key) <> '';

CREATE INDEX IF NOT EXISTS leads_start_date_idx ON public.leads (start_date DESC NULLS LAST);

-- 2. Search RPC with date-range / status / zone filters -------------------
DROP FUNCTION IF EXISTS public.admin_search_leads(text, text, text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.admin_search_leads(
  p_search text DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_sort text DEFAULT 'default',
  p_dir text DEFAULT 'desc',
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_start_from date DEFAULT NULL,
  p_start_to date DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_zone text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, created_at timestamp with time zone, full_name text, email text, phone text,
  student_first_name text, student_last_name text, guardian_name text,
  guardian_first_name text, guardian_last_name text, guardian_email text, guardian_phone text,
  start_date date, source_page integer, source_index integer, import_source text, import_key text,
  source_status text, source_location text, source_zone text, source_account_created_on date,
  lead_status text, notes text, total_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_q text := nullif(btrim(coalesce(p_search, '')), '');
  v_sort text := lower(coalesce(p_sort, 'default'));
  v_dir text := CASE WHEN lower(coalesce(p_dir,'desc')) = 'asc' THEN 'asc' ELSE 'desc' END;
  v_order text;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF v_sort NOT IN ('default','source_index','start_date','student_name','created_at','source_account_created_on') THEN
    v_sort := 'default';
  END IF;

  v_order := CASE v_sort
    WHEN 'default' THEN format(
      'f.start_date %1$s NULLS LAST, f.source_account_created_on %1$s NULLS LAST, f.source_index asc NULLS LAST', v_dir)
    WHEN 'start_date' THEN format('f.start_date %s NULLS LAST', v_dir)
    WHEN 'source_account_created_on' THEN format('f.source_account_created_on %s NULLS LAST', v_dir)
    WHEN 'student_name' THEN format(
      'lower(coalesce(nullif(btrim(coalesce(f.student_last_name,'''') || '' '' || coalesce(f.student_first_name,'''')),''''), f.full_name, '''')) %s NULLS LAST', v_dir)
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
        AND ($5 IS NULL OR (l.start_date IS NOT NULL AND l.start_date >= $5))
        AND ($6 IS NULL OR (l.start_date IS NOT NULL AND l.start_date <= $6))
        AND ($7 IS NULL OR lower(btrim(coalesce(l.source_status,''))) = lower(btrim($7)))
        AND ($8 IS NULL OR lower(btrim(coalesce(l.source_zone,''))) = lower(btrim($8)))
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
  USING v_q,
        nullif(btrim(coalesce(p_source,'')), ''),
        greatest(1, least(coalesce(p_limit,50), 500)),
        greatest(0, coalesce(p_offset,0)),
        p_start_from,
        p_start_to,
        nullif(btrim(coalesce(p_status,'')), ''),
        nullif(btrim(coalesce(p_zone,'')), '');
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_search_leads(text, text, text, text, integer, integer, date, date, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_search_leads(text, text, text, text, integer, integer, date, date, text, text) TO authenticated;

-- 3. Filter option lists --------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_lead_filter_options()
RETURNS TABLE(kind text, value text, lead_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT 'status'::text, btrim(l.source_status), count(*)
  FROM public.leads l
  WHERE nullif(btrim(coalesce(l.source_status,'')),'') IS NOT NULL
  GROUP BY btrim(l.source_status)
  UNION ALL
  SELECT 'zone'::text, btrim(l.source_zone), count(*)
  FROM public.leads l
  WHERE nullif(btrim(coalesce(l.source_zone,'')),'') IS NOT NULL
  GROUP BY btrim(l.source_zone)
  ORDER BY 1, 2;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_lead_filter_options() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_lead_filter_options() TO authenticated;