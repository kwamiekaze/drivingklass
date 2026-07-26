import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactSubmissionRequest {
  full_name: string;
  phone: string;
  email: string;
  pickup_address?: string;
  dropoff_address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  message?: string;
  // Permit attachment (was "ID")
  file_data?: string;
  file_name?: string;
  file_type?: string;
  // Backward compat (older clients)
  city?: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body: ContactSubmissionRequest = await req.json();

    if (!body.email || !body.full_name || !body.phone) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, full_name, phone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: submission, error: insertError } = await supabase
      .from("contact_submissions")
      .insert({
        full_name: body.full_name.trim(),
        phone: body.phone.trim(),
        email: body.email.trim().toLowerCase(),
        city: body.city?.trim() || null,
        message: body.message?.trim() || null,
        pickup_address: body.pickup_address?.trim() || null,
        dropoff_address: body.dropoff_address?.trim() || null,
        emergency_contact_name: body.emergency_contact_name?.trim() || null,
        emergency_contact_phone: body.emergency_contact_phone?.trim() || null,
        status: "new",
      })
      .select("id")
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: `Database error: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let attachmentPath: string | null = null;
    let attachmentName: string | null = null;

    if (body.file_data && body.file_name && body.file_type) {
      try {
        const base64 = body.file_data.replace(/^data:[^;]+;base64,/, "");
        const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const ext = body.file_name.split(".").pop() || "jpg";
        const filePath = `contact-permits/${submission.id}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from("id-uploads")
          .upload(filePath, binary, {
            contentType: body.file_type,
            cacheControl: "3600",
            upsert: false,
          });

        if (!upErr) {
          attachmentPath = filePath;
          attachmentName = body.file_name;
          await supabase
            .from("contact_submissions")
            .update({
              attachment_url: attachmentPath,
              attachment_name: attachmentName,
              permit_attachment_path: attachmentPath,
              permit_attachment_name: attachmentName,
            })
            .eq("id", submission.id);
        }
      } catch (e) {
        console.error("File processing error:", e);
      }
    }

    // Fire-and-forget admin notification. Must never block or fail the user's submission.
    try {
      fetch(`${supabaseUrl}/functions/v1/notify-admins-submission`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          type: "contact",
          submission_id: submission.id,
          sourceLabel: "Homepage Contact Form",
        }),
      }).catch((e) => console.warn("notify-admins-submission (contact) failed", e));
    } catch (e) {
      console.warn("notify-admins-submission (contact) dispatch error", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: submission.id,
        has_attachment: !!attachmentPath,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
