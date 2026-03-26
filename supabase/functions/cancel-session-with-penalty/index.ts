import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { session_id, reason, waive_fee, suppress_student_notification } = await req.json();
    if (!session_id) {
      return new Response(
        JSON.stringify({ error: "session_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user role
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const userRole = roleData?.role || "student";
    const isStaffOrAdmin = ["admin", "staff", "instructor"].includes(userRole);

    // Students cannot waive fees
    const shouldWaiveFee = waive_fee === true && isStaffOrAdmin;

    // Fetch session
    const { data: session, error: sessionError } = await serviceClient
      .from("sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: "Session not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Idempotent: already cancelled
    if (session.status === "cancelled") {
      return new Response(
        JSON.stringify({ success: true, message: "Session was already cancelled", penalty_applied: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate time difference
    const sessionStart = new Date(session.starts_at);
    const now = new Date();
    const hoursUntil = (sessionStart.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Penalty applies if < 24 hours before start (including past sessions) AND not waived
    const isLate = hoursUntil < 24;
    const penaltyApplies = isLate && !shouldWaiveFee;
    const penaltyHours = penaltyApplies ? 0.5 : 0;

    // Determine cancelled_by_role
    let cancelledByRole = userRole;
    if (cancelledByRole === "staff") cancelledByRole = "admin";

    // 1. Update session
    const { error: updateError } = await serviceClient
      .from("sessions")
      .update({
        status: "cancelled",
        cancelled_at: now.toISOString(),
        cancelled_by: user.id,
        cancelled_by_role: cancelledByRole,
        cancellation_reason: reason || "No reason provided",
        cancel_penalty_hours: penaltyHours,
        cancel_penalty_applied: penaltyApplies,
        cancellation_fee_waived: shouldWaiveFee,
      })
      .eq("id", session_id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to cancel session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Apply penalty (deduct 0.5 hours) if applicable and not already applied
    let penaltyDeducted = false;
    if (penaltyApplies && !session.cancel_penalty_applied) {
      const { data: studentProfile } = await serviceClient
        .from("profiles")
        .select("hours_remaining")
        .eq("id", session.student_id)
        .single();

      if (studentProfile) {
        const currentHours = studentProfile.hours_remaining ?? 0;
        const newHours = Math.max(currentHours - 0.5, 0);

        const { error: deductError } = await serviceClient
          .from("profiles")
          .update({ hours_remaining: newHours })
          .eq("id", session.student_id);

        if (!deductError) {
          penaltyDeducted = true;
          console.log(`Penalty: Deducted 0.5 hours from student ${session.student_id}. New balance: ${newHours}`);
        }
      }
    }

    // 3. Build student-facing notification message (privacy-safe)
    // Only send if not suppressed
    const shouldNotifyStudent = !(suppress_student_notification === true && isStaffOrAdmin);

    if (shouldNotifyStudent) {
      let studentMessage: string;
      if (isLate && penaltyApplies) {
        studentMessage = "Cancellation fee incurred due to late cancellation, cancellations made within 24 hours of a session are subject to a 30 minute reduction in remaining hours cancellation fee.";
      } else if (isLate && shouldWaiveFee) {
        const waivingRole = cancelledByRole === "instructor" ? "instructor" : "admin";
        studentMessage = `Cancellation waived by ${waivingRole}`;
      } else {
        studentMessage = "No cancellation fee applied.";
      }

      const notifTitle = cancelledByRole === "student" ? "Session Canceled" : "Session Canceled by DrivingKlass";

      const { error: notifError } = await serviceClient
        .from("notifications")
        .insert({
          user_id: session.student_id,
          type: "session_cancelled",
          title: notifTitle,
          message: studentMessage,
          session_id: session_id,
          severity: penaltyApplies ? "warning" : "info",
          dedupe_key: `cancel_${session_id}`,
        });

      if (notifError) {
        console.error("Notification insert error:", notifError);
      }
    } else {
      console.log(`Student notification suppressed for session ${session_id}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: penaltyDeducted
          ? "Session cancelled. 30 minute penalty applied."
          : shouldWaiveFee
            ? "Session cancelled. Late cancellation fee waived."
            : "Session cancelled successfully.",
        penalty_applied: penaltyDeducted,
        penalty_hours: penaltyHours,
        fee_waived: shouldWaiveFee,
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
