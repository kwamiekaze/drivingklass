// Ambient declaration for Deno-only `process.env` used inside MCP tool files
// under src/lib/mcp/tools/. These files are bundled into a Supabase Edge
// Function by @lovable.dev/mcp-js at build time; they never run in the browser.
declare const process: { env: Record<string, string | undefined> };
