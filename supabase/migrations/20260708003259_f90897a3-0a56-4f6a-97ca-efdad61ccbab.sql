
CREATE TABLE public.health_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_type text NOT NULL CHECK (scan_type IN ('quick','full','manual')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  score integer,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed')),
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  triggered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.health_scans TO authenticated;
GRANT ALL ON public.health_scans TO service_role;
ALTER TABLE public.health_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view scans" ON public.health_scans FOR SELECT TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Service role manages scans" ON public.health_scans FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE INDEX idx_health_scans_started ON public.health_scans(started_at DESC);

CREATE TABLE public.health_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid REFERENCES public.health_scans(id) ON DELETE CASCADE,
  category text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info','warning','critical')),
  check_key text NOT NULL,
  description text NOT NULL,
  affected_entity_type text,
  affected_entity_id uuid,
  student_id uuid,
  student_name text,
  session_id uuid,
  report_id uuid,
  suggested_fix text,
  fixable boolean NOT NULL DEFAULT false,
  fix_action text,
  fix_payload jsonb,
  fixed_at timestamptz,
  fixed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.health_issues TO authenticated;
GRANT ALL ON public.health_issues TO service_role;
ALTER TABLE public.health_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view issues" ON public.health_issues FOR SELECT TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Admins update issues" ON public.health_issues FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Service role manages issues" ON public.health_issues FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE INDEX idx_health_issues_scan ON public.health_issues(scan_id);
CREATE INDEX idx_health_issues_category ON public.health_issues(category);
CREATE INDEX idx_health_issues_severity ON public.health_issues(severity);
CREATE INDEX idx_health_issues_student ON public.health_issues(student_id);

CREATE TABLE public.health_repair_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid REFERENCES public.health_issues(id) ON DELETE SET NULL,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  before_data jsonb,
  after_data jsonb,
  result text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.health_repair_log TO authenticated;
GRANT ALL ON public.health_repair_log TO service_role;
ALTER TABLE public.health_repair_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view repair log" ON public.health_repair_log FOR SELECT TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Service role manages repair log" ON public.health_repair_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE INDEX idx_health_repair_log_created ON public.health_repair_log(created_at DESC);
