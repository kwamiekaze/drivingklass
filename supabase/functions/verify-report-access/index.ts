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
      return new Response(
        JSON.stringify({ error: "Missing slug or access code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch report card by slug
    const { data: report, error } = await supabaseAdmin
      .from("report_cards")
      .select(`
        id, created_at, session_id, student_id, instructor_id,
        is_public, public_access_code, public_share_slug,
        acceleration, braking, left_turns, right_turns,
        speed_maintenance, lane_maintenance, blind_spots, signal_usage,
        changing_lanes, following_distance, road_sign_awareness, distractions,
        general_parking, reverse_parking, parallel_parking, straight_line_backing,
        turn_about, merging, interstate, overall,
        transcription_summary, message_to_student
      `)
      .eq("public_share_slug", slug)
      .eq("is_public", true)
      .single();

    if (error || !report) {
      return new Response(
        JSON.stringify({ error: "Report not found or not public" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify access code
    if (report.public_access_code !== access_code) {
      return new Response(
        JSON.stringify({ error: "Incorrect access code" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch session details
    const { data: session } = await supabaseAdmin
      .from("sessions")
      .select("starts_at, ends_at, status, session_type")
      .eq("id", report.session_id)
      .single();

    // Fetch student and instructor names
    const { data: student } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, full_name")
      .eq("id", report.student_id)
      .single();

    const { data: instructor } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, full_name")
      .eq("id", report.instructor_id)
      .single();

    const getName = (p: any) => {
      if (!p) return "Unknown";
      const combined = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      return combined || p.full_name || "Unknown";
    };

    // Remove sensitive fields
    const { public_access_code: _code, ...safeReport } = report;

    return new Response(
      JSON.stringify({
        report: {
          ...safeReport,
          student_name: getName(student),
          instructor_name: getName(instructor),
          session_starts_at: session?.starts_at || null,
          session_ends_at: session?.ends_at || null,
          session_type: session?.session_type || "driving",
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
