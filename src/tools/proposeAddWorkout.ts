import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AuthContext } from "../auth.js";
import { lopningLivet } from "../lopningLivetClient.js";
import { WIDGETS } from "../widgets.js";

/**
 * Write action. Mirrors the `propose_*` pattern of the existing Löpning & Livet
 * MCP server: it does NOT apply the change, it creates a pending proposal and
 * returns a confirmation card. The user confirms inside the widget, which then
 * calls `apply_proposal` (left as a TODO for the real backend).
 */
export function registerProposeAddWorkout(server: McpServer, auth: AuthContext): void {
  server.registerTool(
    "propose_add_workout",
    {
      title: "Föreslå att lägga till ett pass",
      description:
        "Skapar ett förslag om att lägga till ett eget pass i medlemmens aktiva program (passet läggs inte till förrän användaren bekräftar). Kräver scope training:write.",
      inputSchema: {
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Datum för passet, ISO yyyy-mm-dd. Måste ligga inom det aktiva programmets period."),
        type: z.string().describe("Passtyp, t.ex. 'Lugnt', 'Intervaller', 'Långpass', 'Tröskel'."),
        distanceKm: z.number().positive().max(80).optional().describe("Planerad distans i km."),
        durationMin: z.number().int().positive().max(600).optional().describe("Planerad tid i minuter."),
        note: z.string().max(280).optional().describe("Fritext som visas på passet."),
      },
      _meta: {
        "openai/outputTemplate": WIDGETS.proposal.uri,
        "openai/toolInvocation/invoking": "Förbereder förslag…",
        "openai/toolInvocation/invoked": "Förslag klart att granska",
        "openai/widgetAccessible": true,
        "openai/resultCanProduceWidget": true,
        // Signals to ChatGPT that this tool changes user data.
        "openai/writeAction": true,
      },
    },
    async (input) => {
      if (!auth.scopes.includes("training:write")) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: "Saknar behörighet (training:write) för att ändra programmet." }],
        };
      }
      const result = await lopningLivet.proposeAddWorkout(auth.accessToken, input);
      return {
        content: [{ type: "text" as const, text: `${result.summary} Väntar på bekräftelse.` }],
        structuredContent: result,
      };
    },
  );
}
