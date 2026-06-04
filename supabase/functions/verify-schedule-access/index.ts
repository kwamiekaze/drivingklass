import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { slug, access_code } = await req.json().catch(() => ({}));
    if (!slug || !access_code) return json({ error: "Missing slug or access code" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: share, error: shareError } = await admin
      .from("student_schedule_shares")
      .select("id, student_id, is_public, public_share_slug, public_access_code")
      .eq("public_share_slug", slug)
      .eq("is_public", true)
      .maybeSingle();

    if (shareError || !share) return json({ error: "Schedule not found or not public" }, 404);
    if (share.public_access_code !== access_code) return json({ error: "Incorrect access code" }, 403);

    const [{ data: student }, { data: sessions }] = await Promise.all([
      admin.from("profiles").select("first_name, last_name, full_name").eq("id", share.student_id).maybeSingle(),
      admin
        .from("sessions")
        .select("id, starts_at, ends_at, status, session_type, pickup_address, dropoff_address, instructor:profiles!sessions_instructor_id_fkey(first_name,last_name,full_name)")
        .eq("student_id", share.student_id)
        .neq("status", "cancelled")
        .order("starts_at", { ascending: true }),
    ]);

    const getName = (profile: any, fallback: string) => {
      const joined = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
      return joined || profile?.full_name || fallback;
    };

    return json({
      schedule: {
        student_name: getName(student, "Student"),
        sessions: (sessions || []).map((session: any) => ({
          id: session.id,
          starts_at: session.starts_at,
          ends_at: session.ends_at,
          status: session.status,
          session_type: session.session_type,
          pickup_address: session.pickup_address,
          dropoff_address: session.dropoff_address,
          instructor_name: getName(session.instructor, "Instructor"),
        })),
      },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});