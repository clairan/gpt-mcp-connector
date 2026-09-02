// Bundles each widget entry in web/src/<name>/main.tsx into dist/widgets/<name>.js
// as a single self-contained ESM file (React + ReactDOM inlined). The MCP server
// reads these files at request time and embeds them in the widget resource HTML.

import { build } from "esbuild";
import { mkdirSync } from "node:fs";

const entries = {
  week: "web/src/week/main.tsx",
  "training-log": "web/src/training-log/main.tsx",
  proposal: "web/src/proposal/main.tsx",
};

mkdirSync("dist/widgets", { recursive: true });

await build({
  entryPoints: entries,
  outdir: "dist/widgets",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2020"],
  jsx: "transform",
  minify: true,
  sourcemap: false,
  logLevel: "info",
});

console.log("Widgets built:", Object.keys(entries).join(", "));
