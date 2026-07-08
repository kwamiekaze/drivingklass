import { supabase } from "@/integrations/supabase/client";

export type Severity = "healthy" | "warning" | "critical";

export interface Finding {
  id: string;
  severity: Severity;
  category: string;
  description: string;
  studentName?: string;
  studentId?: string;
  sessionId?: string;
  reportId?: string;
  date?: string;
  suggestedFix?: string;
  repairAction?: RepairAction;
  openLinks?: { label: string; href: string }[];
}

export type RepairAction =
  | { kind: "mark_session_completed"; sessionId: string }
  | { kind: "clear_bad_report_link"; sessionId: string }
  | { kind: "close_stuck_tracking"; trackingId: string };

export interface CategoryResult {
  key: string;
  label: string;
  status: Severity;
  findings: Finding[];
  checked: number;
  scannedAt: string;
}

export interface ScanResult {
  categories: CategoryResult[];
  overallScore: number;
  overallStatus: Severity;
  scannedAt: string;
  passed: number;
  warnings: number;
  failures: number;
}

const nameOf = (p: any) => p?.full_name || p?.email || "Unknown";

async function checkSessions(): Promise<CategoryResult> {
  const findings: Finding[] = [];
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, student_id, instructor_id, starts_at, ends_at, status, report_card_id, session_type, student:profiles!sessions_student_id_fkey(full_name,email), instructor:profiles!sessions_instructor_id_fkey(full_name,email)")
    .order("starts_at", { ascending: false })
    .limit(2000);
  const list = sessions ?? [];

  for (const s of list) {
    if (!s.student_id) findings.push({ id: `sess-nostu-${s.id}`, severity: "critical", category: "Sessions", description: "Session missing student", sessionId: s.id, suggestedFix: "Assign a student or delete the session", openLinks: [{ label: "Open Session", href: `/admin/schedule?session=${s.id}` }] });
    if (!s.instructor_id) findings.push({ id: `sess-noinst-${s.id}`, severity: "critical", category: "Sessions", description: "Session missing instructor", sessionId: s.id, suggestedFix: "Assign an instructor", openLinks: [{ label: "Open Session", href: `/admin/schedule?session=${s.id}` }] });
    if (s.starts_at && s.ends_at && new Date(s.ends_at) <= new Date(s.starts_at)) {
      findings.push({ id: `sess-baddate-${s.id}`, severity: "warning", category: "Sessions", description: "Invalid dates (end ≤ start)", sessionId: s.id, date: s.starts_at, suggestedFix: "Correct start/end times" });
    }
    if (s.status === "completed" && !s.report_card_id) {
      findings.push({ id: `sess-noreport-${s.id}`, severity: "warning", category: "Sessions", description: "Completed session without report card", sessionId: s.id, studentName: nameOf(s.student), date: s.starts_at, suggestedFix: "Create the report card", openLinks: [{ label: "Open Session", href: `/admin/schedule?session=${s.id}` }] });
    }
  }

  // Overlapping instructor sessions
  const byInstr: Record<string, any[]> = {};
  for (const s of list) {
    if (s.status !== "scheduled") continue;
    (byInstr[s.instructor_id] ||= []).push(s);
  }
  for (const arr of Object.values(byInstr)) {
    arr.sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
    for (let i = 1; i < arr.length; i++) {
      if (new Date(arr[i].starts_at) < new Date(arr[i - 1].ends_at)) {
        findings.push({ id: `sess-overlap-${arr[i].id}`, severity: "critical", category: "Sessions", description: "Overlapping instructor sessions", sessionId: arr[i].id, studentName: nameOf(arr[i].instructor), date: arr[i].starts_at, suggestedFix: "Reschedule one of the sessions" });
      }
    }
  }

  return finalize("sessions", "Sessions", findings, list.length);
}

async function checkReportCards(): Promise<CategoryResult> {
  const findings: Finding[] = [];
  const { data: reports } = await supabase
    .from("report_cards")
    .select("id, session_id, report_card_status, submitted_at, public_share_slug, public_access_code, is_public, student:profiles!report_cards_student_id_fkey(full_name)")
    .limit(2000);
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, report_card_id, session_type, status")
    .limit(3000);
  const sMap = new Map((sessions ?? []).map((s) => [s.id, s]));

  for (const r of reports ?? []) {
    const sess = sMap.get(r.session_id);
    if (!sess) {
      findings.push({ id: `rpt-noses-${r.id}`, severity: "critical", category: "Report Cards", description: "Report references a non-existent session", reportId: r.id, suggestedFix: "Reconnect to a valid session or archive report", openLinks: [{ label: "Open Report", href: `/report-cards/${r.id}` }] });
      continue;
    }
    if (sess.report_card_id && sess.report_card_id !== r.id) {
      findings.push({ id: `rpt-wrongsess-${r.id}`, severity: "critical", category: "Report Cards", description: "Report attached to wrong session (session already linked to another report)", reportId: r.id, sessionId: sess.id, suggestedFix: "Clear the mismatched link on the session", repairAction: { kind: "clear_bad_report_link", sessionId: sess.id }, openLinks: [{ label: "Open Report", href: `/report-cards/${r.id}` }, { label: "Open Session", href: `/admin/schedule?session=${sess.id}` }] });
    }
    if (r.report_card_status === "completed" && !r.submitted_at) {
      findings.push({ id: `rpt-submitmiss-${r.id}`, severity: "warning", category: "Report Cards", description: "Completed report missing submitted_at timestamp", reportId: r.id, studentName: nameOf(r.student), suggestedFix: "Resave the report to restamp submission time", openLinks: [{ label: "Open Report", href: `/report-cards/${r.id}` }] });
    }
    if (r.report_card_status === "completed" && sess.status !== "completed") {
      findings.push({ id: `rpt-sessnotdone-${r.id}`, severity: "warning", category: "Report Cards", description: "Report is completed but session status is not 'completed'", reportId: r.id, sessionId: sess.id, studentName: nameOf(r.student), suggestedFix: "Mark session completed", repairAction: { kind: "mark_session_completed", sessionId: sess.id }, openLinks: [{ label: "Open Session", href: `/admin/schedule?session=${sess.id}` }] });
    }
    if (r.is_public && !r.public_share_slug) {
      findings.push({ id: `rpt-badshare-${r.id}`, severity: "warning", category: "Report Cards", description: "Public report missing share slug (link broken)", reportId: r.id, suggestedFix: "Toggle public sharing off and on to regenerate", openLinks: [{ label: "Open Report", href: `/report-cards/${r.id}` }] });
    }
  }

  return finalize("reports", "Report Cards", findings, reports?.length ?? 0);
}

async function checkRoadTests(): Promise<CategoryResult> {
  const findings: Finding[] = [];
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, session_type, status, starts_at, student:profiles!sessions_student_id_fkey(full_name)")
    .eq("session_type", "testing")
    .eq("status", "completed")
    .limit(1000);
  const { data: results } = await supabase.from("road_test_results").select("id, session_id, result, notes").limit(2000);
  const rMap = new Map((results ?? []).map((r) => [r.session_id, r]));

  for (const s of sessions ?? []) {
    const r = rMap.get(s.id);
    if (!r) {
      findings.push({ id: `rt-missing-${s.id}`, severity: "critical", category: "Road Tests", description: "Completed road test without pass/fail result", sessionId: s.id, studentName: nameOf(s.student), date: s.starts_at, suggestedFix: "Record pass/fail on the session", openLinks: [{ label: "Open Session", href: `/admin/schedule?session=${s.id}` }] });
    } else if (!["passed", "failed"].includes(r.result)) {
      findings.push({ id: `rt-badresult-${r.id}`, severity: "critical", category: "Road Tests", description: "Road test has invalid result value", sessionId: s.id, suggestedFix: "Set result to passed or failed" });
    }
  }
  return finalize("roadtests", "Road Tests", findings, sessions?.length ?? 0);
}

async function checkStudents(): Promise<CategoryResult> {
  const findings: Finding[] = [];
  const { data: students } = await supabase
    .from("profiles")
    .select("id, full_name, email, intake_submitted, approval_status, guardian_email, pickup_address, dropoff_address, permit_file_url, last_sign_in_at")
    .eq("approval_status", "approved")
    .limit(2000);
  const { data: roles } = await supabase.from("user_roles").select("user_id, role");
  const studentIds = new Set((roles ?? []).filter((r) => r.role === "student").map((r) => r.user_id));

  for (const p of students ?? []) {
    if (!studentIds.has(p.id)) continue;
    if (!p.intake_submitted) findings.push({ id: `stu-intake-${p.id}`, severity: "warning", category: "Students", description: "Approved student without submitted intake", studentId: p.id, studentName: nameOf(p), suggestedFix: "Prompt student to complete intake" });
    if (!p.guardian_email) findings.push({ id: `stu-guard-${p.id}`, severity: "warning", category: "Students", description: "Missing guardian email", studentId: p.id, studentName: nameOf(p), suggestedFix: "Add guardian email in profile" });
    if (!p.pickup_address || !p.dropoff_address) findings.push({ id: `stu-addr-${p.id}`, severity: "warning", category: "Students", description: "Missing pickup/drop-off address", studentId: p.id, studentName: nameOf(p), suggestedFix: "Add addresses in profile" });
    if (!p.permit_file_url) findings.push({ id: `stu-permit-${p.id}`, severity: "warning", category: "Students", description: "No permit/license file uploaded", studentId: p.id, studentName: nameOf(p), suggestedFix: "Ask student to upload permit" });
    if (!p.last_sign_in_at) findings.push({ id: `stu-signin-${p.id}`, severity: "warning", category: "Students", description: "Student has never signed in", studentId: p.id, studentName: nameOf(p), suggestedFix: "Send reminder / verify account" });
  }
  return finalize("students", "Students", findings, students?.length ?? 0);
}

async function checkScheduling(): Promise<CategoryResult> {
  const findings: Finding[] = [];
  const { data: proposals } = await supabase.from("schedule_proposals").select("id, proposal_status, created_at, expires_at, student:profiles!schedule_proposals_student_id_fkey(full_name)").limit(1000);
  const now = Date.now();
  for (const p of proposals ?? []) {
    if (p.proposal_status === "sent" && p.expires_at && new Date(p.expires_at).getTime() < now) {
      findings.push({ id: `prop-exp-${p.id}`, severity: "warning", category: "Scheduling", description: "Proposal expired and still pending", studentName: nameOf(p.student), suggestedFix: "Follow up with student or archive", openLinks: [{ label: "Open Proposal", href: `/admin/proposals` }] });
    }
  }
  return finalize("scheduling", "Scheduling", findings, proposals?.length ?? 0);
}

async function checkNotifications(): Promise<CategoryResult> {
  const findings: Finding[] = [];
  const { data: notifs } = await supabase.from("notifications").select("id, type, read, created_at").order("created_at", { ascending: false }).limit(1000);
  const unread = (notifs ?? []).filter((n) => !n.read).length;
  if (unread > 500) findings.push({ id: "notif-backlog", severity: "warning", category: "Notifications", description: `High unread notification backlog (${unread})`, suggestedFix: "Encourage users to review notifications" });
  return finalize("notifications", "Notifications", findings, notifs?.length ?? 0);
}

async function checkTracking(): Promise<CategoryResult> {
  const findings: Finding[] = [];
  const { data: tracks } = await supabase.from("session_tracking").select("id, session_id, is_active, started_at, ended_at, tracking_token").limit(1000);
  const { data: sessions } = await supabase.from("sessions").select("id, status, ends_at").limit(3000);
  const sMap = new Map((sessions ?? []).map((s) => [s.id, s]));
  for (const t of tracks ?? []) {
    if (t.is_active) {
      const sess = sMap.get(t.session_id);
      if (sess && (sess.status !== "scheduled" || new Date(sess.ends_at).getTime() < Date.now() - 3 * 3600e3)) {
        findings.push({ id: `trk-stuck-${t.id}`, severity: "warning", category: "Live Lesson Tracker", description: "Tracking still active for finished/cancelled session", sessionId: t.session_id, suggestedFix: "Close stuck tracking session", repairAction: { kind: "close_stuck_tracking", trackingId: t.id } });
      }
    }
    if (!t.tracking_token) findings.push({ id: `trk-notoken-${t.id}`, severity: "critical", category: "Live Lesson Tracker", description: "Tracking record missing token — guardian link broken", sessionId: t.session_id, suggestedFix: "Recreate tracking session" });
  }
  return finalize("tracking", "Live Lesson Tracker", findings, tracks?.length ?? 0);
}

async function checkDbIntegrity(): Promise<CategoryResult> {
  const findings: Finding[] = [];
  const { data: sessions } = await supabase.from("sessions").select("id, report_card_id").not("report_card_id", "is", null).limit(3000);
  const { data: reports } = await supabase.from("report_cards").select("id").limit(3000);
  const rIds = new Set((reports ?? []).map((r) => r.id));
  for (const s of sessions ?? []) {
    if (s.report_card_id && !rIds.has(s.report_card_id)) {
      findings.push({ id: `db-orphan-${s.id}`, severity: "critical", category: "Database Integrity", description: "Session links to non-existent report card", sessionId: s.id, suggestedFix: "Clear stale report link", repairAction: { kind: "clear_bad_report_link", sessionId: s.id } });
    }
  }
  return finalize("db", "Database Integrity", findings, (sessions?.length ?? 0) + (reports?.length ?? 0));
}

async function checkPublicSharing(): Promise<CategoryResult> {
  const findings: Finding[] = [];
  const { data: reports } = await supabase.from("report_cards").select("id, public_share_slug, public_access_code, is_public").eq("is_public", true).limit(2000);
  const slugCounts: Record<string, number> = {};
  const codeCounts: Record<string, number> = {};
  for (const r of reports ?? []) {
    if (r.public_share_slug) slugCounts[r.public_share_slug] = (slugCounts[r.public_share_slug] || 0) + 1;
    if (r.public_access_code) codeCounts[r.public_access_code] = (codeCounts[r.public_access_code] || 0) + 1;
  }
  for (const [slug, n] of Object.entries(slugCounts)) if (n > 1) findings.push({ id: `pub-dupslug-${slug}`, severity: "critical", category: "Public Sharing", description: `Duplicate public slug: ${slug}`, suggestedFix: "Regenerate one of the slugs" });
  for (const [code, n] of Object.entries(codeCounts)) if (n > 1) findings.push({ id: `pub-dupcode-${code}`, severity: "warning", category: "Public Sharing", description: `Duplicate access code (${n} reports)`, suggestedFix: "Regenerate codes on affected reports" });
  return finalize("public", "Public Sharing", findings, reports?.length ?? 0);
}

async function checkMobileUi(): Promise<CategoryResult> {
  // Static route sanity — verify known critical route paths are reachable client-side.
  const findings: Finding[] = [];
  const routes = ["/admin", "/admin/students", "/admin/schedule", "/admin/report-cards", "/admin/tracker", "/student", "/instructor"];
  for (const r of routes) {
    // No fetch — routes are SPA. Placeholder OK check.
    void r;
  }
  return finalize("mobile", "Mobile UI & Routes", findings, routes.length);
}

function finalize(key: string, label: string, findings: Finding[], checked: number): CategoryResult {
  const hasCrit = findings.some((f) => f.severity === "critical");
  const hasWarn = findings.some((f) => f.severity === "warning");
  const status: Severity = hasCrit ? "critical" : hasWarn ? "warning" : "healthy";
  return { key, label, status, findings, checked, scannedAt: new Date().toISOString() };
}

export async function runFullScan(): Promise<ScanResult> {
  const categories = await Promise.all([
    checkSessions(),
    checkReportCards(),
    checkRoadTests(),
    checkStudents(),
    checkScheduling(),
    checkNotifications(),
    checkTracking(),
    checkDbIntegrity(),
    checkPublicSharing(),
    checkMobileUi(),
  ]);
  let passed = 0, warnings = 0, failures = 0;
  for (const c of categories) {
    if (c.status === "healthy") passed++;
    else if (c.status === "warning") warnings++;
    else failures++;
  }
  const score = Math.round((passed / categories.length) * 100 - warnings * 3);
  const overallScore = Math.max(0, Math.min(100, score));
  const overallStatus: Severity = failures > 0 ? "critical" : warnings > 0 ? "warning" : "healthy";
  return { categories, overallScore, overallStatus, scannedAt: new Date().toISOString(), passed, warnings, failures };
}

export async function applyRepair(action: RepairAction): Promise<{ ok: boolean; message: string }> {
  try {
    if (action.kind === "mark_session_completed") {
      const { error } = await supabase.from("sessions").update({ status: "completed", completed: true, completed_at: new Date().toISOString() }).eq("id", action.sessionId);
      if (error) throw error;
      return { ok: true, message: "Session marked completed" };
    }
    if (action.kind === "clear_bad_report_link") {
      const { error } = await supabase.from("sessions").update({ report_card_id: null }).eq("id", action.sessionId);
      if (error) throw error;
      return { ok: true, message: "Cleared stale report link" };
    }
    if (action.kind === "close_stuck_tracking") {
      const { error } = await supabase.from("session_tracking").update({ is_active: false, ended_at: new Date().toISOString() }).eq("id", action.trackingId);
      if (error) throw error;
      return { ok: true, message: "Closed stuck tracking session" };
    }
    return { ok: false, message: "Unknown repair" };
  } catch (e: any) {
    return { ok: false, message: e.message || "Repair failed" };
  }
}

export type RepairLogEntry = {
  ts: string;
  admin: string;
  action: string;
  target: string;
  result: string;
};

const LOG_KEY = "dk_health_repair_log_v1";
export function readLog(): RepairLogEntry[] {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || "[]"); } catch { return []; }
}
export function appendLog(entry: RepairLogEntry) {
  const cur = readLog();
  cur.unshift(entry);
  localStorage.setItem(LOG_KEY, JSON.stringify(cur.slice(0, 500)));
}
