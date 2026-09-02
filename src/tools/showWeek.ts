import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AuthContext } from "../auth.js";
import { lopningLivet } from "../lopningLivetClient.js";
import { WIDGETS } from "../widgets.js";

export function registerShowWeek(server: McpServer, auth: AuthContext): void {
  server.registerTool(
    "show_training_week",
    {
      title: "Visa träningsvecka",
      description:
        "Hämtar medlemmens aktuella eller nästa träningsvecka från Löpning & Livet och visar den som ett veckoschema. Använd när användaren frågar vad de ska springa den här veckan, nästa vecka, eller hur veckan ser ut.",
      inputSchema: {
        which: z
          .enum(["this", "next"])
          .default("this")
          .describe("'this' = innevarande programvecka, 'next' = nästa programvecka."),
      },
      _meta: {
        "openai/outputTemplate": WIDGETS.week.uri,
        "openai/toolInvocation/invoking": "Hämtar din träningsvecka…",
        "openai/toolInvocation/invoked": "Här är din träningsvecka",
        "openai/widgetAccessible": true,
        "openai/resultCanProduceWidget": true,
      },
    },
    async ({ which }) => {
      const week = await lopningLivet.getWeek(auth.accessToken, which);
      const lines = week.days
        .map((d) => {
          const w = d.workouts.map((x) => x.title).join(", ") || "–";
          return `${d.weekday} ${d.date}: ${w}`;
        })
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `${week.programName}, vecka ${week.weekNumber} (${week.weekOfTotal}). Fokus: ${week.focus}\n${lines}`,
          },
        ],
        structuredContent: week,
      };
    },
  );
}
