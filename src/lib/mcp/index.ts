import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoamiTool from "./tools/whoami";
import listMySessionsTool from "./tools/list-my-sessions";
import listMyReportCardsTool from "./tools/list-my-report-cards";

// The OAuth issuer MUST be the direct Supabase host (see app-mcp-server-authoring).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "driving-klass-mcp",
  title: "Driving Klass MCP",
  version: "0.1.0",
  instructions:
    "Tools for Driving Klass. Use `whoami` to check the signed-in user, `list_my_sessions` for their driving/testing sessions, and `list_my_report_cards` for their report cards. All results are scoped by RLS to the caller.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoamiTool, listMySessionsTool, listMyReportCardsTool],
});
