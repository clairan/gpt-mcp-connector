// Local widget preview harness.
//
//   npm run preview   ->   http://localhost:4180
//
// Renders each built widget bundle in an iframe with a MOCK `window.openai`
// bridge, so you can eyeball the React UI (and the light/dark themes and the
// proposal confirm flow) in a normal browser without ChatGPT. Bridge calls are
// logged into the page.

import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const port = Number(process.env.PREVIEW_PORT ?? 4180);

/** Sample tool output per widget — same shapes the real tools return. */
const SAMPLE = {
  week: {
    programName: "Maraton 42,2k – 12 veckor",
    weekNumber: 3,
    weekOfTotal: "3 av 12",
    mondayDate: "2026-09-07",
    focus: "Bygg grundvolym, första riktiga intervallpasset.",
    days: [
      { date: "2026-09-07", weekday: "Mån", workouts: [{ id: "1", title: "Lugn löpning", type: "Lugnt", plannedDistanceKm: 6, plannedDurationMin: 38, status: "Schemalagt" }] },
      { date: "2026-09-08", weekday: "Tis", workouts: [{ id: "2", title: "Vila", type: "Vila", status: "Schemalagt" }] },
      { date: "2026-09-09", weekday: "Ons", workouts: [{ id: "3", title: "Intervaller 5x800 m", type: "Intervaller", plannedDistanceKm: 8, plannedDurationMin: 45, status: "Schemalagt", description: "800 m i 5k-fart, 2 min jogg vila." }] },
      { date: "2026-09-10", weekday: "Tor", workouts: [{ id: "4", title: "Lugn löpning", type: "Lugnt", plannedDistanceKm: 6, plannedDurationMin: 38, status: "Schemalagt" }] },
      { date: "2026-09-11", weekday: "Fre", workouts: [{ id: "5", title: "Vila", type: "Vila", status: "Schemalagt" }] },
      { date: "2026-09-12", weekday: "Lör", workouts: [{ id: "6", title: "Långpass", type: "Långpass", plannedDistanceKm: 16, plannedDurationMin: 100, status: "Schemalagt" }] },
      { date: "2026-09-13", weekday: "Sön", workouts: [{ id: "7", title: "Lugn löpning + rörlighet", type: "Lugnt", plannedDistanceKm: 5, plannedDurationMin: 32, status: "Schemalagt" }] },
    ],
  },
  "training-log": {
    from: "2026-08-04",
    to: "2026-09-02",
    totalDistanceKm: 35.7,
    totalDurationMin: 220,
    entries: [
      { date: "2026-09-01", title: "Lugn löpning", type: "Lugnt", distanceKm: 6.1, durationMin: 39, feeling: 4, effort: "Lätt", source: "Garmin" },
      { date: "2026-08-30", title: "Tröskelpass 3x2 km", type: "Tröskel", distanceKm: 9.4, durationMin: 52, feeling: 3, effort: "Svårt", source: "Strava" },
      { date: "2026-08-28", title: "Långpass", type: "Långpass", distanceKm: 15.2, durationMin: 96, feeling: 4, effort: "Medel", source: "Garmin" },
      { date: "2026-08-27", title: "Lugn löpning", type: "Lugnt", distanceKm: 5.0, durationMin: 33, feeling: 5, effort: "Lätt", source: "Manuell" },
    ],
  },
  proposal: {
    proposalId: "prop-demo-1",
    summary: "Lägg till Tröskel 8 km den 2026-09-10.",
    addedWorkouts: [{ date: "2026-09-10", title: "Tröskel (eget pass)", type: "Tröskel" }],
    status: "pending_confirmation",
  },
};

const WIDGETS = Object.keys(SAMPLE);

const MIME = { ".js": "text/javascript", ".html": "text/html", ".css": "text/css", ".map": "application/json" };

function framePage(name, theme) {
  const data = JSON.stringify(SAMPLE[name]);
  return `<!doctype html><html><head><meta charset="utf-8">
<style>
  :root { color-scheme: ${theme === "dark" ? "dark" : "light"}; }
  body { margin: 0; background: ${theme === "dark" ? "#131417" : "#eceef1"}; padding: 16px;
         font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  #log { margin-top: 16px; font: 12px ui-monospace, Menlo, monospace; white-space: pre-wrap;
         color: ${theme === "dark" ? "#9aa0a6" : "#6b7280"}; }
</style></head><body>
<div id="lopning-livet-root"></div>
<div id="log"></div>
<script>
  const logEl = document.getElementById("log");
  const log = (...a) => { logEl.textContent += a.map(x => typeof x === "string" ? x : JSON.stringify(x)).join(" ") + "\\n"; };
  window.openai = {
    toolInput: {},
    toolOutput: ${data},
    widgetState: null,
    theme: ${JSON.stringify(theme === "dark" ? "dark" : "light")},
    locale: "sv-SE",
    displayMode: "inline",
    maxHeight: 600,
    async setWidgetState(s) {
      this.widgetState = s; log("→ setWidgetState", s);
      window.dispatchEvent(new CustomEvent("openai:set_globals", { detail: { globals: { widgetState: s } } }));
    },
    async callTool(n, args) {
      log("→ callTool", n, args);
      if (n === "apply_proposal") return { content: [], structuredContent: { status: "applied" } };
      return { content: [] };
    },
    async sendFollowupMessage(a) { log("→ sendFollowupMessage", a); },
    async requestDisplayMode(a) { log("→ requestDisplayMode", a); return { mode: a.mode }; },
  };
</script>
<script type="module" src="/widgets/${name}.js"></script>
</body></html>`;
}

function indexPage() {
  const opts = WIDGETS.map((w) => `<option value="${w}">${w}</option>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Löpning & Livet – widget preview</title>
<style>
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  header { display: flex; gap: 12px; align-items: center; padding: 10px 16px; border-bottom: 1px solid #ddd; }
  select { font-size: 14px; padding: 4px 6px; }
  iframe { width: 100%; border: 0; height: calc(100vh - 52px); }
</style></head><body>
<header>
  <strong>Widget preview</strong>
  <label>Widget <select id="w">${opts}</select></label>
  <label>Tema <select id="t"><option value="light">light</option><option value="dark">dark</option></select></label>
</header>
<iframe id="f"></iframe>
<script>
  const f = document.getElementById("f"), w = document.getElementById("w"), t = document.getElementById("t");
  const sync = () => { f.src = "/frame?widget=" + w.value + "&theme=" + t.value + "&_=" + Date.now(); };
  w.onchange = t.onchange = sync; sync();
</script>
</body></html>`;
}

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);

  try {
    if (url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html" }).end(indexPage());
      return;
    }
    if (url.pathname === "/frame") {
      const name = url.searchParams.get("widget");
      if (!WIDGETS.includes(name)) {
        res.writeHead(404).end("unknown widget");
        return;
      }
      res.writeHead(200, { "content-type": "text/html" }).end(framePage(name, url.searchParams.get("theme")));
      return;
    }
    if (url.pathname.startsWith("/widgets/")) {
      const file = join(root, "dist", url.pathname.replace(/^\/+/, ""));
      const body = await readFile(file).catch(() => null);
      if (!body) {
        res.writeHead(404, { "content-type": "text/plain" })
          .end("Bundle saknas. Kör: npm run build:widgets");
        return;
      }
      res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" }).end(body);
      return;
    }
    res.writeHead(404).end("not found");
  } catch (err) {
    res.writeHead(500).end(String(err));
  }
});

httpServer.listen(port, () => {
  console.log(`Widget preview på http://localhost:${port}`);
  console.log(`Widgets: ${WIDGETS.join(", ")}`);
});
