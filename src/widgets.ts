/**
 * Widget (UI component) registration.
 *
 * In the Apps SDK a tool result is rendered by an HTML template that ChatGPT
 * loads in a sandboxed iframe. The template is an MCP *resource* with the
 * special mime type `text/html+skybridge`. It boots a small React bundle that
 * talks to the host through `window.openai`.
 *
 * Each bundle is produced by `npm run build:widgets` (esbuild) into
 * `dist/widgets/<name>.js`. We inline it into the resource text so there is a
 * single self-contained document to serve.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const widgetsDir = join(dirname(fileURLToPath(import.meta.url)), "widgets");

export interface WidgetDef {
  /** Logical name, also the bundle filename (<name>.js). */
  name: string;
  /** Resource URI referenced by tools via `openai/outputTemplate`. */
  uri: string;
  title: string;
  /** CSP hosts the widget is allowed to reach, if any. */
  csp?: { connectSrc?: string[]; resourceSrc?: string[] };
}

export const WIDGETS: Record<"week" | "trainingLog" | "proposal", WidgetDef> = {
  week: { name: "week", uri: "ui://widget/week.html", title: "Träningsvecka" },
  trainingLog: { name: "training-log", uri: "ui://widget/training-log.html", title: "Träningslogg" },
  proposal: { name: "proposal", uri: "ui://widget/proposal.html", title: "Förslag" },
};

function bundle(name: string): string {
  try {
    return readFileSync(join(widgetsDir, `${name}.js`), "utf8");
  } catch {
    return `document.getElementById("lopning-livet-root").textContent =
      "Widget-bundlen '${name}.js' saknas. Kör: npm run build:widgets";`;
  }
}

function html(widget: WidgetDef): string {
  return [
    `<div id="lopning-livet-root"></div>`,
    `<script type="module">${bundle(widget.name)}</script>`,
  ].join("\n");
}

export function registerWidgets(server: McpServer): void {
  for (const widget of Object.values(WIDGETS)) {
    server.registerResource(
      widget.name,
      widget.uri,
      { title: widget.title, mimeType: "text/html+skybridge" },
      async () => ({
        contents: [
          {
            uri: widget.uri,
            mimeType: "text/html+skybridge",
            text: html(widget),
            _meta: {
              "openai/widgetPrefersBorder": true,
              ...(widget.csp
                ? {
                    "openai/widgetCSP": {
                      connect_domains: widget.csp.connectSrc ?? [],
                      resource_domains: widget.csp.resourceSrc ?? [],
                    },
                  }
                : {}),
            },
          },
        ],
      }),
    );
  }
}
