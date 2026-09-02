import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as sleep } from "node:timers/promises";

/** Grab an OS-assigned free TCP port. */
export function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once("error", reject);
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

/**
 * Start the MCP server as a child process with the given env, wait until it
 * answers on /healthz, and return { port, url, stop() }.
 */
export async function startServer(env = {}) {
  const port = await freePort();
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "src/server.ts"],
    {
      cwd: new URL("..", import.meta.url),
      env: {
        ...process.env,
        PORT: String(port),
        USE_MOCK_BACKEND: "true",
        AUTH_DISABLED: "true",
        PUBLIC_BASE_URL: `http://localhost:${port}`,
        ...env,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let log = "";
  child.stdout.on("data", (d) => (log += d));
  child.stderr.on("data", (d) => (log += d));

  const base = `http://localhost:${port}`;
  const deadline = Date.now() + 10_000;
  for (;;) {
    if (child.exitCode !== null) {
      throw new Error(`server exited early (code ${child.exitCode}):\n${log}`);
    }
    try {
      const res = await fetch(`${base}/healthz`);
      if (res.ok) break;
    } catch {
      /* not up yet */
    }
    if (Date.now() > deadline) throw new Error(`server did not start:\n${log}`);
    await sleep(150);
  }

  return {
    port,
    url: `${base}/mcp`,
    base,
    getLog: () => log,
    async stop() {
      child.kill("SIGTERM");
      await new Promise((r) => child.once("exit", r));
    },
  };
}
