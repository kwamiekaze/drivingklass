import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  session_id: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // User client for auth verification
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service client for bypassing RLS on updates
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is authenticated
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get request body
    const body: RequestBody = await req.json();
    const { session_id } = body;

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: "session_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing session completion: ${session_id} by user: ${user.id}`);

    // Get user role
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const userRole = roleData?.role || "student";
    const isStaffOrAdmin = userRole === "admin" || userRole === "staff";
    const isInstructor = userRole === "instructor";

    // Fetch the session
    const { data: session, error: sessionError } = await serviceClient
      .from("sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (sessionError || !session) {
      console.error("Session fetch error:", sessionError);
      return new Response(
        JSON.stringify({ error: "Session not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check permissions: admin/staff can complete any, instructor can complete their own
    const canComplete = isStaffOrAdmin || (isInstructor && session.instructor_id === user.id);
    if (!canComplete) {
      return new Response(
        JSON.stringify({ error: "Not authorized to complete this session" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if session is already cancelled
    if (session.status === "cancelled") {
      return new Response(
        JSON.stringify({ error: "Cannot complete a cancelled session" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already completed and hours already deducted
    if (session.status === "completed" && session.hours_deducted_at) {
      console.log("Session already completed and hours already deducted");
      
      // Fetch current student hours
      const { data: studentProfile } = await serviceClient
        .from("profiles")
        .select("hours_remaining")
        .eq("id", session.student_id)
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          message: "Session was already completed",
          hours_deducted: false,
          session: session,
          student_hours_remaining: studentProfile?.hours_remaining ?? 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate duration in hours from duration_minutes
    const durationHours = session.duration_minutes / 60;

    // Start transaction-like operations
    // 1. Update session to completed
    const { error: updateSessionError } = await serviceClient
      .from("sessions")
      .update({
        status: "completed",
        completed: true,
        completed_at: new Date().toISOString(),
        completed_by: user.id,
        hours_deducted_at: new Date().toISOString(),
      })
      .eq("id", session_id);

    if (updateSessionError) {
      console.error("Session update error:", updateSessionError);
      return new Response(
        JSON.stringify({ error: "Failed to complete session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Deduct hours from student (only if not previously deducted)
    let hoursDeducted = false;
    let newHoursRemaining = 0;

    if (!session.hours_deducted_at) {
      // Get current student hours
      const { data: studentProfile, error: profileError } = await serviceClient
        .from("profiles")
        .select("hours_remaining")
        .eq("id", session.student_id)
        .single();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
      } else {
        const currentHours = studentProfile?.hours_remaining ?? 0;
        newHoursRemaining = Math.max(currentHours - durationHours, 0);

        const { error: updateProfileError } = await serviceClient
          .from("profiles")
          .update({ hours_remaining: newHoursRemaining })
          .eq("id", session.student_id);

        if (updateProfileError) {
          console.error("Profile update error:", updateProfileError);
        } else {
          hoursDeducted = true;
          console.log(`Deducted ${durationHours} hours from student ${session.student_id}. New balance: ${newHoursRemaining}`);
        }
      }
    }

    // Fetch updated session
    const { data: updatedSession } = await serviceClient
      .from("sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    // Fetch student hours
    const { data: finalStudentProfile } = await serviceClient
      .from("profiles")
      .select("hours_remaining")
      .eq("id", session.student_id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        message: hoursDeducted 
          ? `Session completed. ${durationHours.toFixed(1)} hours deducted.`
          : "Session completed (hours were already deducted)",
        hours_deducted: hoursDeducted,
        duration_hours: durationHours,
        session: updatedSession,
        student_hours_remaining: finalStudentProfile?.hours_remaining ?? newHoursRemaining,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
