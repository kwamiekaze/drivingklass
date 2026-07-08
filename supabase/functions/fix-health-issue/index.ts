import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "unauthorized" }, 401);
    const userId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdmin } = await admin.rpc("is_staff_or_admin", { _user_id: userId }).maybeSingle().then(() => admin.rpc("has_role", { _user_id: userId, _role: "admin" }));
    // Fallback direct check
    const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const roles = new Set((roleRows ?? []).map((r: any) => r.role));
    if (!roles.has("admin") && !roles.has("staff")) return json({ error: "forbidden" }, 403);
    void isAdmin;

    const body = await req.json();
    const { issue_id, action, payload } = body as { issue_id: string; action: string; payload: Record<string, unknown> };
    if (!issue_id || !action) return json({ error: "missing issue_id or action" }, 400);

    // Load issue
    const { data: issue } = await admin.from("health_issues").select("*").eq("id", issue_id).maybeSingle();
    if (!issue) return json({ error: "issue not found" }, 404);
    if ((issue as any).fixed_at) return json({ error: "issue already fixed" }, 400);

    let before: any = null;
    let after: any = null;
    let result = "";

    if (action === "mark_session_completed") {
      const sessionId = (payload?.session_id ?? (issue as any).fix_payload?.session_id) as string;
      const { data: prev } = await admin.from("sessions").select("id,status,completed,completed_at").eq("id", sessionId).maybeSingle();
      before = prev;
      const { data: upd, error } = await admin.from("sessions").update({ status: "completed", completed: true, completed_at: new Date().toISOString() }).eq("id", sessionId).select("id,status,completed,completed_at").maybeSingle();
      if (error) throw error;
      after = upd;
      result = "Session marked completed";
    } else if (action === "clear_bad_report_link") {
      const sessionId = (payload?.session_id ?? (issue as any).fix_payload?.session_id) as string;
      const { data: prev } = await admin.from("sessions").select("id,report_card_id").eq("id", sessionId).maybeSingle();
      before = prev;
      const { data: upd, error } = await admin.from("sessions").update({ report_card_id: null }).eq("id", sessionId).select("id,report_card_id").maybeSingle();
      if (error) throw error;
      after = upd;
      result = "Cleared stale report link";
    } else if (action === "close_tracking") {
      const trackingId = (payload?.tracking_id ?? (issue as any).fix_payload?.tracking_id) as string;
      const { data: prev } = await admin.from("session_tracking").select("id,is_active,ended_at").eq("id", trackingId).maybeSingle();
      before = prev;
      const { data: upd, error } = await admin.from("session_tracking").update({ is_active: false, ended_at: new Date().toISOString() }).eq("id", trackingId).select("id,is_active,ended_at").maybeSingle();
      if (error) throw error;
      after = upd;
      result = "Tracking session closed";
    } else if (action === "stamp_submitted_at") {
      const reportId = (payload?.report_id ?? (issue as any).fix_payload?.report_id) as string;
      const { data: prev } = await admin.from("report_cards").select("id,submitted_at,created_at").eq("id", reportId).maybeSingle();
      before = prev;
      const stamp = (prev as any)?.created_at ?? new Date().toISOString();
      const { data: upd, error } = await admin.from("report_cards").update({ submitted_at: stamp }).eq("id", reportId).select("id,submitted_at").maybeSingle();
      if (error) throw error;
      after = upd;
      result = "Submitted timestamp restored";
    } else if (action === "refresh_completed_hours") {
      const studentId = (payload?.student_id ?? (issue as any).fix_payload?.student_id) as string;
      const correct = Number(payload?.correct_hours ?? (issue as any).fix_payload?.correct_hours ?? 0);
      const { data: prev } = await admin.from("profiles").select("id,total_hours_completed").eq("id", studentId).maybeSingle();
      before = prev;
      const { data: upd, error } = await admin.from("profiles").update({ total_hours_completed: correct }).eq("id", studentId).select("id,total_hours_completed").maybeSingle();
      if (error) throw error;
      after = upd;
      result = `Completed hours refreshed to ${correct.toFixed(2)}`;
    } else {
      return json({ error: `Unsupported action: ${action}` }, 400);
    }

    await admin.from("health_issues").update({ fixed_at: new Date().toISOString(), fixed_by: userId }).eq("id", issue_id);
    await admin.from("health_repair_log").insert({ issue_id, admin_id: userId, action, before_data: before, after_data: after, result });

    return json({ ok: true, result, before, after });
  } catch (e) {
    console.error("fix-health-issue error", e);
    return json({ ok: false, error: String((e as Error).message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
