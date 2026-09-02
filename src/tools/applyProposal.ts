import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AuthContext } from "../auth.js";
import { lopningLivet } from "../lopningLivetClient.js";

/** Applies a proposal created by `propose_add_workout`. Called from the widget's Bekräfta button. */
export function registerApplyProposal(server: McpServer, auth: AuthContext): void {
  server.registerTool(
    "apply_proposal",
    {
      title: "Bekräfta förslag",
      description:
        "Verkställer ett tidigare skapat förslag (t.ex. från propose_add_workout). Anropas normalt av bekräfta-knappen i förslagsvyn.",
      inputSchema: {
        proposalId: z.string().describe("Id från förslaget som ska verkställas."),
      },
      _meta: { "openai/writeAction": true },
    },
    async ({ proposalId }) => {
      if (!auth.scopes.includes("training:write")) {
        return { isError: true, content: [{ type: "text" as const, text: "Saknar behörighet (training:write)." }] };
      }
      const result = await lopningLivet.applyProposal(auth.accessToken, proposalId);
      return {
        content: [{ type: "text" as const, text: `Klart: ${result.summary}` }],
        structuredContent: result,
      };
    },
  );
}
