// Supabase Edge Function: get-report-card-audio-url
// Returns a signed URL for a private report card audio file after enforcing authorization.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceKey) {
      console.error("Missing env vars", {
        hasUrl: !!supabaseUrl,
        hasAnon: !!anonKey,
        hasService: !!serviceKey,
      });
      return json({ error: "Server misconfigured" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: { persistSession: false },
    });

    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    const user = userRes?.user;

    if (userErr || !user) {
      console.warn("Unauthorized request", { userErr });
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const reportCardId = body?.report_card_id as string | undefined;

    if (!reportCardId) {
      return json({ error: "Missing report_card_id" }, 400);
    }

    const { data: role, error: roleErr } = await userClient.rpc("get_user_role", { _user_id: user.id });
    if (roleErr) {
      console.warn("Role lookup failed", roleErr);
    }

    const roleStr = String(role ?? "user");
    const isStaff = roleStr === "admin" || roleStr === "staff";

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: rc, error: rcErr } = await adminClient
      .from("report_cards")
      .select("id, student_id, instructor_id, audio_path, audio_mime, lesson_audio_url")
      .eq("id", reportCardId)
      .maybeSingle();

    if (rcErr) {
      console.error("Report card lookup failed", rcErr);
      return json({ error: "Failed to load report card" }, 500);
    }

    if (!rc) {
      return json({ error: "Not found" }, 404);
    }

    const allowed = isStaff || rc.student_id === user.id || rc.instructor_id === user.id;
    if (!allowed) {
      return json({ error: "Forbidden" }, 403);
    }

    if (rc.audio_path) {
      const { data: signed, error: signErr } = await adminClient.storage
        .from("report_card_audio")
        .createSignedUrl(rc.audio_path, 60 * 60);

      if (signErr || !signed?.signedUrl) {
        console.error("Failed to sign URL", signErr);
        return json({ error: "Audio unavailable" }, 404);
      }

      return json({ signedUrl: signed.signedUrl, mime: rc.audio_mime ?? null });
    }

    // Legacy fallback: older rows may still point to a public URL
    if (rc.lesson_audio_url) {
      return json({ legacyUrl: rc.lesson_audio_url, mime: rc.audio_mime ?? null });
    }

    return json({ signedUrl: null, mime: null });
  } catch (e) {
    console.error("Unhandled error", e);
    return json({ error: "Internal error" }, 500);
  }
});
