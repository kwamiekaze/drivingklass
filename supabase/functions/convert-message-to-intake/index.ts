import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate caller is staff/admin via their JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const caller = userData?.user;
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["admin", "staff"])
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { submission_id } = await req.json();
    if (!submission_id) {
      return new Response(JSON.stringify({ error: "submission_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load submission
    const { data: sub, error: subErr } = await admin
      .from("contact_submissions")
      .select("*")
      .eq("id", submission_id)
      .maybeSingle();
    if (subErr || !sub) {
      return new Response(JSON.stringify({ error: "Submission not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!sub.email) {
      return new Response(JSON.stringify({ error: "Submission has no email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find matching student profile by email (case-insensitive)
    const { data: profile } = await admin
      .from("profiles")
      .select("id, email, intake_submitted")
      .ilike("email", sub.email)
      .maybeSingle();

    if (!profile) {
      return new Response(
        JSON.stringify({
          error: "No registered user found with this email. Ask them to sign up first.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Split name
    const parts = (sub.full_name || "").trim().split(/\s+/);
    const first_name = parts[0] || "";
    const last_name = parts.slice(1).join(" ") || "";

    // Copy permit attachment from id-uploads -> permits bucket
    let permitPath: string | null = null;
    const srcPath = sub.permit_attachment_path || sub.attachment_url;
    const srcName = sub.permit_attachment_name || sub.attachment_name;
    if (srcPath) {
      const { data: file, error: dlErr } = await admin.storage
        .from("id-uploads")
        .download(srcPath);
      if (!dlErr && file) {
        const ext = (srcName || srcPath).split(".").pop() || "jpg";
        const newPath = `${profile.id}/converted-${Date.now()}.${ext}`;
        const buf = new Uint8Array(await file.arrayBuffer());
        const { error: upErr } = await admin.storage
          .from("permits")
          .upload(newPath, buf, { contentType: file.type || "image/jpeg", upsert: false });
        if (!upErr) {
          permitPath = newPath;
          await admin.from("permit_documents").upsert(
            {
              student_id: profile.id,
              uploaded_by: caller.id,
              bucket: "permits",
              file_path: newPath,
              file_name: srcName,
              mime_type: file.type || "image/jpeg",
              size_bytes: buf.byteLength,
              source: "intake_form",
              status: "pending_review",
              is_current: true,
            },
            { onConflict: "student_id,source", ignoreDuplicates: false }
          );
        }
      }
    }

    // Update profile with the submission's data
    const update: Record<string, any> = {
      full_name: sub.full_name || undefined,
      first_name: first_name || undefined,
      last_name: last_name || undefined,
      phone: sub.phone || undefined,
      pickup_address: sub.pickup_address || undefined,
      dropoff_address: sub.dropoff_address || undefined,
      guardian_name: sub.emergency_contact_name || undefined,
      guardian_phone: sub.emergency_contact_phone || undefined,
      intake_submitted: true,
      approval_status: profile.intake_submitted ? undefined : "pending",
      intake_updated_at: new Date().toISOString(),
      intake_updated_by: caller.id,
      intake_last_edit_role: "admin",
    };
    // Strip undefineds
    Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

    const { error: updErr } = await admin.from("profiles").update(update).eq("id", profile.id);
    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clear any existing draft
    await admin.from("intake_drafts").delete().eq("user_id", profile.id);

    // Mark submission as converted
    await admin
      .from("contact_submissions")
      .update({
        status: "converted",
        converted_profile_id: profile.id,
        converted_at: new Date().toISOString(),
        converted_by: caller.id,
      })
      .eq("id", submission_id);

    // Notify the student
    await admin.from("notifications").insert({
      user_id: profile.id,
      title: "Intake Pre-filled",
      message: "We've used your message to set up your intake. Sign in to review.",
      type: "system",
    });

    return new Response(
      JSON.stringify({ success: true, profile_id: profile.id, permit_copied: !!permitPath }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
