import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

declare const process: { env: Record<string, string | undefined> };

export default defineTool({
  name: "list_my_sessions",
  title: "List my sessions",
  description:
    "List driving/testing sessions for the signed-in user (student, instructor, or admin). RLS scopes visibility.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).default(20).describe("Max sessions to return."),
    status: z
      .enum(["scheduled", "completed", "cancelled", "any"])
      .default("any")
      .describe("Filter by session status."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, status }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    let q = supabase
      .from("sessions")
      .select("id, scheduled_at, duration_minutes, status, session_type, pickup_address, dropoff_address, student_id, instructor_id")
      .order("scheduled_at", { ascending: false })
      .limit(limit);
    if (status !== "any") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { sessions: data ?? [] },
    };
  },
});
