import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AuthContext } from "../auth.js";
import { lopningLivet } from "../lopningLivetClient.js";
import { WIDGETS } from "../widgets.js";

export function registerShowTrainingLog(server: McpServer, auth: AuthContext): void {
  server.registerTool(
    "show_training_log",
    {
      title: "Visa träningslogg",
      description:
        "Hämtar medlemmens genomförda pass de senaste dagarna från Löpning & Livet och visar dem som en lista med total distans och tid. Använd när användaren vill se vad de har tränat den senaste tiden.",
      inputSchema: {
        days: z
          .number()
          .int()
          .min(1)
          .max(90)
          .default(7)
          .describe("Antal dagar bakåt att hämta (1–90)."),
      },
      _meta: {
        "openai/outputTemplate": WIDGETS.trainingLog.uri,
        "openai/toolInvocation/invoking": "Hämtar din träningslogg…",
        "openai/toolInvocation/invoked": "Här är din träningslogg",
        "openai/widgetAccessible": true,
        "openai/resultCanProduceWidget": true,
      },
    },
    async ({ days }) => {
      const log = await lopningLivet.getTrainingLog(auth.accessToken, days);
      return {
        content: [
          {
            type: "text" as const,
            text: `${log.entries.length} pass ${log.from}–${log.to}: ${log.totalDistanceKm} km, ${log.totalDurationMin} min totalt.`,
          },
        ],
        structuredContent: log,
      };
    },
  );
}
