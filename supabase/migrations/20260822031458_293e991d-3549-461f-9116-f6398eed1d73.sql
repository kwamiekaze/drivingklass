
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS student_first_name text,
  ADD COLUMN IF NOT EXISTS student_last_name text,
  ADD COLUMN IF NOT EXISTS guardian_first_name text,
  ADD COLUMN IF NOT EXISTS guardian_last_name text,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS source_page integer,
  ADD COLUMN IF NOT EXISTS source_index integer,
  ADD COLUMN IF NOT EXISTS import_source text,
  ADD COLUMN IF NOT EXISTS import_key text;

CREATE UNIQUE INDEX IF NOT EXISTS leads_import_key_uidx ON public.leads (import_key) WHERE import_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_source_index_idx ON public.leads (source_index);
CREATE INDEX IF NOT EXISTS leads_import_source_idx ON public.leads (import_source);
CREATE INDEX IF NOT EXISTS leads_start_date_idx ON public.leads (start_date);

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
  IF NOT public.is_staff_or_admin(auth.uid()) THEN
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
