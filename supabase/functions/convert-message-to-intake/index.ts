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

const temporaryPassword = () =>
  `${crypto.randomUUID()}-${crypto.randomUUID()}-DrivingKlass!9`;

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
      return json({ error: "Backend auth configuration is missing. Please retry after deployment finishes." }, 500);
    }

    // Validate caller is staff/admin via their JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const caller = userData?.user;
    if (!caller) {
      return json({ error: "Unauthorized" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["admin", "staff"])
      .maybeSingle();
    if (!roleRow) {
      return json({ error: "Forbidden" }, 403);
    }

    const { submission_id } = await req.json().catch(() => ({}));
    if (!submission_id) {
      return json({ error: "submission_id required" }, 400);
    }

    // Load submission
    const { data: sub, error: subErr } = await admin
      .from("contact_submissions")
      .select("*")
      .eq("id", submission_id)
      .maybeSingle();
    if (subErr || !sub) {
      return json({ error: "Submission not found" }, 404);
    }

    if (!sub.email) {
      return json({ error: "Submission has no email" }, 400);
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
        return json({ error: createErr?.message || "Could not create the student account." }, 500);
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
      if (profileErr) return json({ error: profileErr.message }, 500);
    }

    const profile = existingProfile || { id: authUser.id, email, intake_submitted: false };

    const { error: roleErr } = await admin
      .from("user_roles")
      .upsert({ user_id: profile.id, role: "student" }, { onConflict: "user_id,role", ignoreDuplicates: true });
    if (roleErr) return json({ error: roleErr.message }, 500);

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
      return json({ error: updErr.message }, 500);
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

    const { error: resetErr } = await admin.auth.resetPasswordForEmail(email, {
      redirectTo: "https://drivingklass.com/reset-password?from=conversion",
    });
    if (resetErr) {
      return json({ error: `Intake converted, but password email failed: ${resetErr.message}` }, 500);
    }

    return json({
      success: true,
      profile_id: profile.id,
      account_created: createdAuthUser,
      permit_copied: !!permitPath,
      password_email_sent: true,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
