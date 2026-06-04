import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const splitName = (fullName: string | null | undefined) => {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  return { first_name: parts[0] || "", last_name: parts.slice(1).join(" ") || "" };
};

const temporaryPassword = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `DrivingKlass!9-${token}`;
};

const fail = (message: string, status = 500, details?: unknown) => {
  console.error("[convert-message-to-intake]", message, details || "");
  return json({ error: message }, status);
};

async function findAuthUserByEmail(admin: any, email: string) {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data?.users?.find((u: any) => (u.email || "").toLowerCase() === target);
    if (found) return found;
    if (!data?.users || data.users.length < 1000) break;
  }
  return null;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

    if (!supabaseUrl || !serviceKey || !anonKey) {
      return fail("Backend auth configuration is missing. Please retry after deployment finishes.");
    }

    // Validate caller is staff/admin via their JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return fail("Unauthorized", 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const caller = userData?.user;
    if (!caller) {
      return fail("Unauthorized", 401);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["admin", "staff"])
      .maybeSingle();
    if (!roleRow) {
      return fail("Forbidden", 403);
    }

    const { submission_id, redirect_origin } = await req.json().catch(() => ({}));
    if (!submission_id) {
      return fail("submission_id required", 400);
    }

    // Load submission
    const { data: sub, error: subErr } = await admin
      .from("contact_submissions")
      .select("*")
      .eq("id", submission_id)
      .maybeSingle();
    if (subErr || !sub) {
      return fail("Submission not found", 404, subErr);
    }

    if (!sub.email) {
      return fail("Submission has no email", 400);
    }

    const email = String(sub.email).trim().toLowerCase();
    const { first_name, last_name } = splitName(sub.full_name);

    let createdAuthUser = false;
    let authUser = await findAuthUserByEmail(admin, email);

    if (!authUser) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: temporaryPassword(),
        email_confirm: true,
        user_metadata: { full_name: sub.full_name || email },
      });
      if (createErr || !created?.user) {
        return fail(createErr?.message || "Could not create the student account.", 500, createErr);
      }
      authUser = created.user;
      createdAuthUser = true;
    }

    // Find matching student profile by email (case-insensitive)
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id, email, intake_submitted")
      .ilike("email", email)
      .maybeSingle();

    if (!existingProfile) {
      const { error: profileErr } = await admin.from("profiles").upsert(
        {
          id: authUser.id,
          email,
          full_name: sub.full_name || null,
          first_name: first_name || null,
          last_name: last_name || null,
          intake_submitted: false,
          approval_status: "pending",
        },
        { onConflict: "id" }
      );
      if (profileErr) return fail(profileErr.message, 500, profileErr);
    }

    const profile = existingProfile || { id: authUser.id, email, intake_submitted: false };

    const { error: roleErr } = await admin
      .from("user_roles")
      .upsert({ user_id: profile.id, role: "student" }, { onConflict: "user_id,role", ignoreDuplicates: true });
    if (roleErr) return fail(roleErr.message, 500, roleErr);

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
          await admin
            .from("permit_documents")
            .update({ is_current: false })
            .eq("student_id", profile.id)
            .eq("source", "intake_form");
          await admin.from("permit_documents").insert({
            student_id: profile.id,
            uploaded_by: caller.id,
            bucket: "permits",
            file_path: newPath,
            file_name: srcName,
            mime_type: file.type || "image/jpeg",
            size_bytes: buf.byteLength,
            source: "intake_form",
            document_type: "permit",
            status: "pending_review",
            is_current: true,
          });
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
      approval_status: "pending",
      intake_updated_at: new Date().toISOString(),
      intake_updated_by: caller.id,
      intake_last_edit_role: "admin",
    };
    // Strip undefineds
    Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

    const { error: updErr } = await admin.from("profiles").update(update).eq("id", profile.id);
    if (updErr) {
      return fail(updErr.message, 500, updErr);
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
      message: "We've used your message to set up your intake. Use the password update link sent to your email to sign in.",
      type: "system",
    });

    const allowedRedirectOrigins = [
      "https://drivingklass.com",
      "https://www.drivingklass.com",
      "https://drivingklass.lovable.app",
      "https://id-preview--d9554c7f-6bfa-4824-8d60-0836bb30b872.lovable.app",
    ];
    const requestedOrigin = typeof redirect_origin === "string" ? redirect_origin.replace(/\/$/, "") : "";
    const baseRedirects = [requestedOrigin, ...allowedRedirectOrigins].filter(
      (origin, index, origins) => origin && allowedRedirectOrigins.includes(origin) && origins.indexOf(origin) === index
    );
    const resetRedirects = baseRedirects.map((origin) => `${origin}/reset-password?from=conversion`);
    let resetErr: any = null;
    for (const redirectTo of resetRedirects) {
      const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo });
      resetErr = error;
      if (!error) break;
    }
    if (resetErr) {
      return fail(`Intake converted, but password email failed: ${resetErr.message}`, 500, resetErr);
    }

    return json({
      success: true,
      profile_id: profile.id,
      account_created: createdAuthUser,
      permit_copied: !!permitPath,
      password_email_sent: true,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unknown error", 500, error);
  }
});
