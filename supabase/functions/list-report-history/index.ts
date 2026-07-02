import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slug, access_code } = await req.json();
    if (!slug || !access_code) {
      return new Response(JSON.stringify({ error: "Missing slug or access code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate parent report by slug + code
    const { data: parent, error: parentErr } = await admin
      .from("report_cards")
      .select("id, student_id, public_access_code, is_public")
      .eq("public_share_slug", slug)
      .eq("is_public", true)
      .single();

    if (parentErr || !parent) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (parent.public_access_code !== access_code) {
      return new Response(JSON.stringify({ error: "Incorrect access code" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const studentId = parent.student_id;

    // All non-cancelled sessions for this student -> canonical numbering
    const { data: allSessions } = await admin
      .from("sessions")
      .select("id, starts_at, session_type, instructor_id")
      .eq("student_id", studentId)
      .neq("status", "cancelled")
      .order("starts_at", { ascending: true });

    const sessionNumMap: Record<string, number> = {};
    const sessionMeta: Record<string, { starts_at: string; session_type: string; instructor_id: string }> = {};
    (allSessions || []).forEach((s: any, i: number) => {
      sessionNumMap[s.id] = i + 1;
      sessionMeta[s.id] = { starts_at: s.starts_at, session_type: s.session_type, instructor_id: s.instructor_id };
    });

    const sessionIds = (allSessions || []).map((s: any) => s.id);

    // Completed report cards
    const { data: reports } = await admin
      .from("report_cards")
      .select("id, session_id, created_at, overall, instructor_id")
      .eq("student_id", studentId)
      .eq("report_card_status", "completed")
      .in("session_id", sessionIds.length ? sessionIds : ["00000000-0000-0000-0000-000000000000"]);

    // Road test results
    const { data: roadTests } = await admin
      .from("road_test_results")
      .select("id, session_id, result")
      .eq("student_id", studentId)
      .in("session_id", sessionIds.length ? sessionIds : ["00000000-0000-0000-0000-000000000000"]);

    const reportBySession: Record<string, any> = {};
    (reports || []).forEach((r: any) => { reportBySession[r.session_id] = r; });
    const rtBySession: Record<string, any> = {};
    (roadTests || []).forEach((r: any) => { rtBySession[r.session_id] = r; });

    // Instructor names
    const instrIds = Array.from(new Set([
      ...(reports || []).map((r: any) => r.instructor_id),
      ...(allSessions || []).map((s: any) => s.instructor_id),
    ].filter(Boolean)));
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, first_name, last_name, full_name")
      .in("id", instrIds.length ? instrIds : ["00000000-0000-0000-0000-000000000000"]);
    const instrMap: Record<string, string> = {};
    (profiles || []).forEach((p: any) => {
      const combined = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      instrMap[p.id] = combined || p.full_name || "Instructor";
    });

    // Build items: one per session that has a report card or road test
    const items = (allSessions || [])
      .map((s: any) => {
        const rpt = reportBySession[s.id];
        const rt = rtBySession[s.id];
        if (!rpt && !rt) return null;
        const isRoadTest = s.session_type === "testing";
        return {
          session_id: s.id,
          session_type: s.session_type,
          session_starts_at: s.starts_at,
          session_number: sessionNumMap[s.id] || 0,
          instructor_name: instrMap[s.instructor_id] || "Instructor",
          report_card_id: !isRoadTest && rpt ? rpt.id : null,
          overall: !isRoadTest && rpt ? rpt.overall : null,
          road_test_outcome: isRoadTest && rt ? rt.result : null,
          created_at: rpt?.created_at || s.starts_at,
        };
      })
      .filter(Boolean)
      // Newest first
      .sort((a: any, b: any) =>
        new Date(b.session_starts_at).getTime() - new Date(a.session_starts_at).getTime()
      );

    return new Response(
      JSON.stringify({
        items,
        current_report_id: parent.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (_err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
