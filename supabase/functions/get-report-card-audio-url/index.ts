// Supabase Edge Function: get-report-card-audio-url
// Returns a signed URL for a private report card audio file after enforcing authorization.
// ALWAYS returns 200 with JSON - never throws or returns non-2xx to prevent client crashes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// CRITICAL: Always return 200 with JSON body - let frontend handle errors gracefully
function jsonSuccess(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Structured logging helper
  const log = (level: string, message: string, details?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level, message, timestamp: new Date().toISOString(), ...details }));
  };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceKey) {
      log("error", "Missing environment variables", {
        hasUrl: !!supabaseUrl,
        hasAnon: !!anonKey,
        hasService: !!serviceKey,
      });
      return jsonSuccess({ error: "Server configuration error. Please try again later." });
    }

    // Parse request body first
    const body = await req.json().catch(() => ({}));
    const reportCardId = body?.report_card_id as string | undefined;

    log("info", "Audio URL request received", { reportCardId: reportCardId ?? "missing" });

    if (!reportCardId) {
      log("warn", "Missing report_card_id in request");
      return jsonSuccess({ error: "Missing report card ID" });
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization") ?? "";
    
    if (!authHeader) {
      log("warn", "No authorization header", { reportCardId });
      return jsonSuccess({ error: "Authentication required" });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
      auth: { persistSession: false },
    });

    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    const user = userRes?.user;

    if (userErr || !user) {
      log("warn", "User authentication failed", { 
        reportCardId, 
        error: userErr?.message ?? "No user found" 
      });
      return jsonSuccess({ error: "Please log in to access audio" });
    }

    log("info", "User authenticated", { userId: user.id, reportCardId });

    // Get user role - use admin client to bypass RLS
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Fetch role using admin client for reliability
    const { data: roleData, error: roleErr } = await adminClient.rpc("get_user_role", { _user_id: user.id });
    
    if (roleErr) {
      log("warn", "Role lookup failed, defaulting to user", { 
        userId: user.id, 
        error: roleErr.message 
      });
    }

    const roleStr = String(roleData ?? "user").toLowerCase();
    const isStaff = roleStr === "admin" || roleStr === "staff" || roleStr === "instructor";

    log("info", "Role determined", { userId: user.id, role: roleStr, isStaff });

    // Fetch report card using admin client
    const { data: rc, error: rcErr } = await adminClient
      .from("report_cards")
      .select("id, student_id, instructor_id, audio_path, audio_mime, lesson_audio_url")
      .eq("id", reportCardId)
      .maybeSingle();

    if (rcErr) {
      log("error", "Report card lookup failed", { 
        reportCardId, 
        error: rcErr.message 
      });
      return jsonSuccess({ error: "Could not load report card data" });
    }

    if (!rc) {
      log("warn", "Report card not found", { reportCardId });
      return jsonSuccess({ error: "Report card not found" });
    }

    log("info", "Report card found", { 
      reportCardId, 
      studentId: rc.student_id, 
      instructorId: rc.instructor_id,
      hasAudioPath: !!rc.audio_path,
      hasLegacyUrl: !!rc.lesson_audio_url
    });

    // Authorization check: user must be student, instructor, or staff
    const isOwner = rc.student_id === user.id;
    const isInstructor = rc.instructor_id === user.id;
    const allowed = isStaff || isOwner || isInstructor;

    if (!allowed) {
      log("warn", "Access denied", { 
        userId: user.id, 
        reportCardId, 
        role: roleStr,
        isOwner,
        isInstructor 
      });
      return jsonSuccess({ error: "You don't have permission to access this audio" });
    }

    log("info", "Access authorized", { userId: user.id, reportCardId, reason: isOwner ? "owner" : isInstructor ? "instructor" : "staff" });

    // Generate signed URL if audio_path exists
    if (rc.audio_path) {
      log("info", "Generating signed URL", { audioPath: rc.audio_path });

      const { data: signed, error: signErr } = await adminClient.storage
        .from("report_card_audio")
        .createSignedUrl(rc.audio_path, 60 * 15); // 15 minutes

      if (signErr || !signed?.signedUrl) {
        log("error", "Signed URL generation failed", { 
          audioPath: rc.audio_path, 
          error: signErr?.message ?? "No URL returned" 
        });
        return jsonSuccess({ 
          error: "Audio file unavailable. It may have been deleted.",
          signedUrl: null,
          legacyUrl: rc.lesson_audio_url ?? null,
          mime: rc.audio_mime ?? null
        });
      }

      log("info", "Signed URL generated successfully", { reportCardId });
      return jsonSuccess({ 
        signedUrl: signed.signedUrl, 
        mime: rc.audio_mime ?? null,
        legacyUrl: null,
        error: null
      });
    }

    // Legacy fallback: older rows may still point to a public URL
    if (rc.lesson_audio_url) {
      log("info", "Using legacy audio URL", { reportCardId });
      return jsonSuccess({ 
        legacyUrl: rc.lesson_audio_url, 
        signedUrl: null,
        mime: rc.audio_mime ?? null,
        error: null
      });
    }

    // No audio attached
    log("info", "No audio attached to report card", { reportCardId });
    return jsonSuccess({ 
      signedUrl: null, 
      legacyUrl: null,
      mime: null,
      error: null
    });

  } catch (e) {
    // CRITICAL: Never throw - always return valid JSON
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    console.error("Unhandled exception in get-report-card-audio-url:", errorMessage, e);
    
    return jsonSuccess({ 
      error: "An unexpected error occurred. Please try again.",
      signedUrl: null,
      legacyUrl: null,
      mime: null
    });
  }
});
