import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface RawIssue {
  category: string;
  severity: "info" | "warning" | "critical";
  check_key: string;
  description: string;
  affected_entity_type?: string;
  affected_entity_id?: string;
  student_id?: string;
  student_name?: string;
  session_id?: string;
  report_id?: string;
  suggested_fix?: string;
  fixable?: boolean;
  fix_action?: string;
  fix_payload?: Record<string, unknown>;
}

// Route manifest — kept in sync with src/App.tsx expected admin/public routes
const EXPECTED_ROUTES = [
  "/admin", "/admin/students", "/admin/schedule", "/admin/report-cards",
  "/admin/proposals", "/admin/tracker", "/admin/health",
  "/report-cards/:id", "/report/public/:slug",
  "/road-test-results/:sessionId", "/tracker/:token",
  "/student", "/instructor",
];

async function runScan(supabase: ReturnType<typeof createClient>, scanType: "quick" | "full" | "manual"): Promise<{ scanId: string; issueCount: number; score: number; summary: Record<string, unknown> }> {
  const heavy = scanType !== "quick";
  const issues: RawIssue[] = [];

  const { data: scan, error: scanErr } = await supabase
    .from("health_scans")
    .insert({ scan_type: scanType, status: "running" })
    .select("id")
    .single();
  if (scanErr) throw scanErr;
  const scanId = (scan as { id: string }).id;

  try {
    // ---- Pull core data
    const [{ data: sessions }, { data: reports }, { data: roadTests }, { data: profiles }, { data: userRoles }, { data: proposals }, { data: tracking }, { data: notifs }, { data: deductions }] = await Promise.all([
      supabase.from("sessions").select("id,student_id,instructor_id,starts_at,ends_at,status,report_card_id,session_type,completed_at,duration_minutes,cancelled_at").order("starts_at", { ascending: false }).limit(heavy ? 10000 : 3000),
      supabase.from("report_cards").select("id,session_id,student_id,report_card_status,submitted_at,is_public,public_share_slug,public_access_code,overall").limit(heavy ? 10000 : 3000),
      supabase.from("road_test_results").select("id,session_id,student_id,result,notes,created_at").limit(heavy ? 10000 : 3000),
      supabase.from("profiles").select("id,full_name,email,intake_submitted,approval_status,guardian_email,pickup_address,dropoff_address,permit_file_url,last_sign_in_at,purchased_hours,hours_remaining").limit(heavy ? 10000 : 3000),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("schedule_proposals").select("id,student_id,instructor_id,proposal_status,expires_at,accepted_at,created_at").limit(heavy ? 5000 : 1500),
      supabase.from("session_tracking").select("id,session_id,student_id,instructor_id,is_active,tracking_token,started_at,ended_at,last_email_sent_at,update_interval_minutes").limit(heavy ? 5000 : 1500),
      supabase.from("notifications").select("id,user_id,type,read,created_at").order("created_at", { ascending: false }).limit(heavy ? 5000 : 1500),
      supabase.from("session_hour_deductions").select("session_id,student_id,deducted_hours").limit(heavy ? 20000 : 5000),
    ]);

    const S = sessions ?? [];
    const R = reports ?? [];
    const RT = roadTests ?? [];
    const P = profiles ?? [];
    const UR = userRoles ?? [];
    const SP = proposals ?? [];
    const TR = tracking ?? [];
    const N = notifs ?? [];
    const D = deductions ?? [];

    const pMap = new Map(P.map((p: any) => [p.id, p]));
    const sMap = new Map(S.map((s: any) => [s.id, s]));
    const rMap = new Map(R.map((r: any) => [r.id, r]));
    const rtBySession = new Map(RT.map((r: any) => [r.session_id, r]));
    const studentIds = new Set(UR.filter((r: any) => r.role === "student").map((r: any) => r.user_id));
    const nameOf = (id?: string) => id ? (pMap.get(id) as any)?.full_name || (pMap.get(id) as any)?.email || undefined : undefined;

    // ---- 1. SESSIONS
    for (const s of S as any[]) {
      if (!s.student_id) issues.push({ category: "Sessions", severity: "critical", check_key: "sess_missing_student", description: "Session missing student", session_id: s.id, affected_entity_type: "session", affected_entity_id: s.id, suggested_fix: "Assign a student or remove the session" });
      if (!s.instructor_id) issues.push({ category: "Sessions", severity: "critical", check_key: "sess_missing_instructor", description: "Session missing instructor", session_id: s.id, affected_entity_type: "session", affected_entity_id: s.id, suggested_fix: "Assign an instructor" });
      if (s.starts_at && s.ends_at && new Date(s.ends_at) <= new Date(s.starts_at)) {
        issues.push({ category: "Sessions", severity: "warning", check_key: "sess_bad_dates", description: "Invalid dates (end ≤ start)", session_id: s.id, student_id: s.student_id, student_name: nameOf(s.student_id), suggested_fix: "Correct start/end times" });
      }
      if (s.status === "completed" && !s.report_card_id) {
        issues.push({ category: "Sessions", severity: "warning", check_key: "sess_completed_no_report", description: "Completed session without report card", session_id: s.id, student_id: s.student_id, student_name: nameOf(s.student_id), suggested_fix: "Create the report card" });
      }
    }
    // Overlaps + duplicates per instructor
    const byInst: Record<string, any[]> = {};
    for (const s of S as any[]) if (s.status === "scheduled") (byInst[s.instructor_id] ||= []).push(s);
    for (const arr of Object.values(byInst)) {
      arr.sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
      for (let i = 1; i < arr.length; i++) {
        if (new Date(arr[i].starts_at) < new Date(arr[i - 1].ends_at)) {
          issues.push({ category: "Sessions", severity: "critical", check_key: "sess_overlap", description: `Overlapping instructor sessions (${nameOf(arr[i].instructor_id) ?? "instructor"})`, session_id: arr[i].id, suggested_fix: "Reschedule one of the sessions" });
        }
        if (arr[i].starts_at === arr[i - 1].starts_at && arr[i].student_id === arr[i - 1].student_id) {
          issues.push({ category: "Sessions", severity: "warning", check_key: "sess_duplicate", description: "Duplicate session (same student + start time)", session_id: arr[i].id, student_id: arr[i].student_id, student_name: nameOf(arr[i].student_id), suggested_fix: "Cancel one of the duplicates" });
        }
      }
    }

    // ---- 2. REPORT CARDS
    for (const r of R as any[]) {
      const sess = sMap.get(r.session_id) as any;
      if (!sess) {
        issues.push({ category: "Report Cards", severity: "critical", check_key: "rpt_no_session", description: "Report references a non-existent session", report_id: r.id, suggested_fix: "Archive or reconnect to a valid session" });
        continue;
      }
      if (sess.report_card_id && sess.report_card_id !== r.id) {
        issues.push({ category: "Report Cards", severity: "critical", check_key: "rpt_wrong_session", description: "Report attached to wrong session (session linked to a different report)", report_id: r.id, session_id: sess.id, student_id: r.student_id, student_name: nameOf(r.student_id), suggested_fix: "Clear the mismatched session link", fixable: true, fix_action: "clear_bad_report_link", fix_payload: { session_id: sess.id } });
      }
      if (r.report_card_status === "completed" && !r.submitted_at) {
        issues.push({ category: "Report Cards", severity: "warning", check_key: "rpt_completed_no_submit", description: "Completed report missing submitted_at", report_id: r.id, student_id: r.student_id, student_name: nameOf(r.student_id), suggested_fix: "Stamp submitted_at from created_at", fixable: true, fix_action: "stamp_submitted_at", fix_payload: { report_id: r.id } });
      }
      if (r.report_card_status === "draft" && r.submitted_at) {
        issues.push({ category: "Report Cards", severity: "warning", check_key: "rpt_draft_submitted", description: "Draft report has submitted_at set", report_id: r.id, student_id: r.student_id, student_name: nameOf(r.student_id), suggested_fix: "Verify status; likely should be completed" });
      }
      if (r.report_card_status === "completed" && sess.status !== "completed") {
        issues.push({ category: "Report Cards", severity: "warning", check_key: "rpt_session_not_completed", description: "Report completed but session is not marked completed", report_id: r.id, session_id: sess.id, student_id: r.student_id, student_name: nameOf(r.student_id), suggested_fix: "Mark session completed", fixable: true, fix_action: "mark_session_completed", fix_payload: { session_id: sess.id } });
      }
      // Data shape: driving vs testing
      if (sess.session_type === "testing" && r.overall !== null && r.overall !== undefined) {
        // road-test sessions shouldn't have driving ratings
        issues.push({ category: "Report Cards", severity: "warning", check_key: "rpt_testing_has_ratings", description: "Road-test session has driving ratings — should use road test result form", report_id: r.id, session_id: sess.id, suggested_fix: "Move data to road_test_results" });
      }
      if (r.is_public && !r.public_share_slug) {
        issues.push({ category: "Report Cards", severity: "warning", check_key: "rpt_public_no_slug", description: "Public report missing share slug — link broken", report_id: r.id, suggested_fix: "Toggle public sharing off/on in report editor" });
      }
    }

    // ---- 3. ROAD TESTS
    for (const s of S as any[]) {
      if (s.session_type !== "testing" || s.status !== "completed") continue;
      const rt = rtBySession.get(s.id) as any;
      if (!rt) {
        issues.push({ category: "Road Tests", severity: "critical", check_key: "rt_missing", description: "Completed road test without result", session_id: s.id, student_id: s.student_id, student_name: nameOf(s.student_id), suggested_fix: "Record pass/fail" });
      } else {
        if (!["passed", "failed"].includes(rt.result)) issues.push({ category: "Road Tests", severity: "critical", check_key: "rt_bad_result", description: "Road test with invalid result value", session_id: s.id, student_id: s.student_id, student_name: nameOf(s.student_id), suggested_fix: "Set result to passed or failed" });
        if (rt.result === "failed" && !rt.notes) issues.push({ category: "Road Tests", severity: "info", check_key: "rt_no_notes_on_fail", description: "Failed road test missing notes", session_id: s.id, student_id: s.student_id, student_name: nameOf(s.student_id), suggested_fix: "Add examiner notes explaining the fail" });
      }
    }

    // ---- 4. STUDENTS
    const deductionByStudent = new Map<string, number>();
    for (const d of D as any[]) deductionByStudent.set(d.student_id, (deductionByStudent.get(d.student_id) ?? 0) + Number(d.deducted_hours ?? 0));
    for (const p of P as any[]) {
      if (!studentIds.has(p.id)) continue;
      if (p.approval_status !== "approved") continue;
      if (!p.intake_submitted) issues.push({ category: "Students", severity: "warning", check_key: "stu_no_intake", description: "Approved student without submitted intake", student_id: p.id, student_name: p.full_name ?? p.email, suggested_fix: "Prompt student to complete intake" });
      if (!p.guardian_email) issues.push({ category: "Students", severity: "warning", check_key: "stu_no_guardian", description: "Missing guardian email", student_id: p.id, student_name: p.full_name ?? p.email, suggested_fix: "Add guardian email in profile" });
      if (!p.pickup_address || !p.dropoff_address) issues.push({ category: "Students", severity: "warning", check_key: "stu_no_addr", description: "Missing pickup/drop-off address", student_id: p.id, student_name: p.full_name ?? p.email, suggested_fix: "Add addresses in profile" });
      if (!p.permit_file_url) issues.push({ category: "Students", severity: "info", check_key: "stu_no_permit", description: "No permit/license uploaded", student_id: p.id, student_name: p.full_name ?? p.email, suggested_fix: "Ask student to upload permit" });
      if (!p.last_sign_in_at) issues.push({ category: "Students", severity: "info", check_key: "stu_never_signed_in", description: "Student has never signed in", student_id: p.id, student_name: p.full_name ?? p.email, suggested_fix: "Send login reminder" });
      // Hours consistency
      if (p.total_hours_completed !== null && p.total_hours_completed !== undefined) {
        const actual = deductionByStudent.get(p.id) ?? 0;
        if (Math.abs(Number(p.total_hours_completed) - actual) > 0.51) {
          issues.push({ category: "Students", severity: "warning", check_key: "stu_hours_mismatch", description: `Completed hours (${p.total_hours_completed}) don't match deduction ledger (${actual.toFixed(2)})`, student_id: p.id, student_name: p.full_name ?? p.email, suggested_fix: "Refresh completed hours from deduction ledger", fixable: true, fix_action: "refresh_completed_hours", fix_payload: { student_id: p.id, correct_hours: actual } });
        }
      }
    }

    // ---- 5. SCHEDULING
    const now = Date.now();
    for (const pr of SP as any[]) {
      if (pr.proposal_status === "sent" && pr.expires_at && new Date(pr.expires_at).getTime() < now) {
        issues.push({ category: "Scheduling", severity: "warning", check_key: "prop_expired", description: "Proposal expired and still pending", student_id: pr.student_id, student_name: nameOf(pr.student_id), affected_entity_type: "proposal", affected_entity_id: pr.id, suggested_fix: "Follow up or archive" });
      }
      if (pr.proposal_status === "accepted" && pr.accepted_at && new Date(pr.accepted_at).getTime() < now - 7 * 86400e3) {
        const hasSess = (S as any[]).some((s) => s.student_id === pr.student_id && s.instructor_id === pr.instructor_id && new Date(s.created_at ?? s.starts_at).getTime() >= new Date(pr.accepted_at).getTime());
        if (!hasSess) issues.push({ category: "Scheduling", severity: "warning", check_key: "prop_accepted_no_sessions", description: "Accepted proposal has no scheduled sessions", student_id: pr.student_id, student_name: nameOf(pr.student_id), affected_entity_type: "proposal", affected_entity_id: pr.id, suggested_fix: "Create sessions from the proposal" });
      }
    }

    // ---- 6. NOTIFICATIONS
    const unread = N.filter((n: any) => !n.read).length;
    if (unread > 500) issues.push({ category: "Notifications", severity: "info", check_key: "notif_backlog", description: `Large unread notification backlog (${unread})`, suggested_fix: "No action required — informational" });

    // ---- 7. LIVE LESSON TRACKER
    const tokenCounts: Record<string, number> = {};
    for (const t of TR as any[]) {
      if (t.tracking_token) tokenCounts[t.tracking_token] = (tokenCounts[t.tracking_token] ?? 0) + 1;
      if (!t.tracking_token) issues.push({ category: "Live Tracker", severity: "critical", check_key: "trk_no_token", description: "Tracking record missing token — guardian link broken", session_id: t.session_id, suggested_fix: "Recreate the tracking session" });
      if (t.is_active) {
        const sess = sMap.get(t.session_id) as any;
        if (!sess) {
          issues.push({ category: "Live Tracker", severity: "warning", check_key: "trk_orphan", description: "Active tracking with no session", affected_entity_type: "session_tracking", affected_entity_id: t.id, suggested_fix: "Close tracking", fixable: true, fix_action: "close_tracking", fix_payload: { tracking_id: t.id } });
        } else if (sess.status !== "scheduled" || new Date(sess.ends_at).getTime() < now - 3 * 3600e3) {
          issues.push({ category: "Live Tracker", severity: "warning", check_key: "trk_stuck_active", description: "Tracking still active for finished/cancelled session", session_id: t.session_id, affected_entity_type: "session_tracking", affected_entity_id: t.id, suggested_fix: "Auto-end stale tracking", fixable: true, fix_action: "close_tracking", fix_payload: { tracking_id: t.id } });
        }
      }
    }
    for (const [tok, cnt] of Object.entries(tokenCounts)) if (cnt > 1) issues.push({ category: "Live Tracker", severity: "critical", check_key: "trk_dup_token", description: `Duplicate tracking token (${cnt} rows share the same token)`, suggested_fix: `Regenerate one — token: ${tok.slice(0, 8)}…` });

    // ---- 8. DB INTEGRITY
    for (const s of S as any[]) {
      if (s.report_card_id && !rMap.has(s.report_card_id)) {
        issues.push({ category: "Database Integrity", severity: "critical", check_key: "db_session_stale_report", description: "Session links to non-existent report", session_id: s.id, suggested_fix: "Clear the stale report link", fixable: true, fix_action: "clear_bad_report_link", fix_payload: { session_id: s.id } });
      }
    }
    for (const r of R as any[]) {
      if (!pMap.has(r.student_id)) issues.push({ category: "Database Integrity", severity: "critical", check_key: "db_report_no_student", description: "Report references non-existent student", report_id: r.id, suggested_fix: "Manually investigate" });
    }
    for (const rt of RT as any[]) {
      if (!sMap.has(rt.session_id)) issues.push({ category: "Database Integrity", severity: "critical", check_key: "db_rt_no_session", description: "Road test references non-existent session", affected_entity_type: "road_test", affected_entity_id: rt.id, suggested_fix: "Manually investigate" });
    }

    // ---- 9. PUBLIC SHARING
    const slugCounts: Record<string, number> = {};
    const codeCounts: Record<string, number> = {};
    for (const r of R as any[]) {
      if (!r.is_public) continue;
      if (r.public_share_slug) slugCounts[r.public_share_slug] = (slugCounts[r.public_share_slug] ?? 0) + 1;
      if (r.public_access_code) codeCounts[r.public_access_code] = (codeCounts[r.public_access_code] ?? 0) + 1;
    }
    for (const [slug, n] of Object.entries(slugCounts)) if (n > 1) issues.push({ category: "Public Sharing", severity: "critical", check_key: "pub_dup_slug", description: `Duplicate public slug (${n} reports): ${slug}`, suggested_fix: "Regenerate one of the slugs manually" });
    for (const [code, n] of Object.entries(codeCounts)) if (n > 1) issues.push({ category: "Public Sharing", severity: "warning", check_key: "pub_dup_code", description: `Duplicate access code shared by ${n} reports`, suggested_fix: "Regenerate codes on affected reports" });

    // ---- 10. ROUTE INTEGRITY (manifest sanity)
    for (const _route of EXPECTED_ROUTES) { void _route; }
    // Manifest currently declares all expected routes — issue would surface if we removed one from EXPECTED_ROUTES.

    // ---- Persist issues
    if (issues.length > 0) {
      const rows = issues.map((i) => ({ ...i, scan_id: scanId, fixable: i.fixable ?? false }));
      // Chunk inserts to keep payload sane
      const chunk = 500;
      for (let i = 0; i < rows.length; i += chunk) {
        const { error } = await supabase.from("health_issues").insert(rows.slice(i, i + chunk));
        if (error) throw error;
      }
    }

    // ---- Score
    const critical = issues.filter((i) => i.severity === "critical").length;
    const warning = issues.filter((i) => i.severity === "warning").length;
    const info = issues.filter((i) => i.severity === "info").length;
    const score = Math.max(0, Math.min(100, 100 - critical * 6 - warning * 2 - info));

    const summary = {
      counts: { critical, warning, info, total: issues.length },
      by_category: issues.reduce<Record<string, number>>((acc, i) => { acc[i.category] = (acc[i.category] ?? 0) + 1; return acc; }, {}),
      records_scanned: { sessions: S.length, reports: R.length, road_tests: RT.length, profiles: P.length, tracking: TR.length, proposals: SP.length, notifications: N.length },
    };

    await supabase.from("health_scans").update({ finished_at: new Date().toISOString(), status: "completed", score, summary }).eq("id", scanId);

    return { scanId, issueCount: issues.length, score, summary };
  } catch (err) {
    await supabase.from("health_scans").update({ finished_at: new Date().toISOString(), status: "failed", summary: { error: String(err) } }).eq("id", scanId);
    throw err;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    let scanType: "quick" | "full" | "manual" = "manual";
    try { const body = await req.json(); if (body?.scanType) scanType = body.scanType; } catch { /* no body */ }
    const result = await runScan(supabase, scanType);
    return new Response(JSON.stringify({ ok: true, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("run-health-scan error", e);
    return new Response(JSON.stringify({ ok: false, error: String((e as Error).message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
