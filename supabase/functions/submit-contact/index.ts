import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactSubmissionRequest {
  full_name: string;
  phone: string;
  city?: string;
  email: string;
  message: string;
  file_data?: string; // Base64 encoded file
  file_name?: string;
  file_type?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("submit-contact function called");

    // Create Supabase client with service role for bypassing RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ContactSubmissionRequest = await req.json();
    console.log("Received submission for:", body.email);

    // Validate required fields
    if (!body.email || !body.full_name || !body.phone) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, full_name, phone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert the contact submission
    const { data: submission, error: insertError } = await supabase
      .from("contact_submissions")
      .insert({
        full_name: body.full_name.trim(),
        phone: body.phone.trim(),
        city: body.city?.trim() || null,
        email: body.email.trim().toLowerCase(),
        message: body.message?.trim() || null,
        status: "new",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: `Database error: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Submission created with ID:", submission.id);

    // Handle file upload if provided
    let attachmentPath: string | null = null;
    let attachmentName: string | null = null;

    if (body.file_data && body.file_name && body.file_type) {
      try {
        console.log("Processing file upload:", body.file_name);
        
        // Decode base64 file data
        const base64Data = body.file_data.replace(/^data:[^;]+;base64,/, "");
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        // Generate file path
        const fileExt = body.file_name.split(".").pop() || "jpg";
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const filePath = `contact-ids/${submission.id}/${timestamp}-${randomStr}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("id-uploads")
          .upload(filePath, binaryData, {
            contentType: body.file_type,
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("File upload error:", uploadError);
          // Don't fail the whole submission, just log
        } else {
          attachmentPath = filePath;
          attachmentName = body.file_name;
          console.log("File uploaded to:", filePath);

          // Update submission with file info
          const { error: updateError } = await supabase
            .from("contact_submissions")
            .update({
              attachment_url: attachmentPath,
              attachment_name: attachmentName,
            })
            .eq("id", submission.id);

          if (updateError) {
            console.error("Failed to update submission with file info:", updateError);
          }
        }
      } catch (fileError) {
        console.error("File processing error:", fileError);
        // Don't fail submission for file errors
      }
    }

    console.log("Contact submission successful");

    return new Response(
      JSON.stringify({
        success: true,
        id: submission.id,
        message: "Contact submission received",
        has_attachment: !!attachmentPath,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error in submit-contact:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
