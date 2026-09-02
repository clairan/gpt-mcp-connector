/**
 * HTTP entrypoint.
 *
 *   POST /mcp                                  -> MCP (Streamable HTTP, stateless)
 *   GET  /.well-known/oauth-protected-resource -> OAuth 2.1 resource metadata
 *   GET  /healthz                              -> liveness
 *
 * Stateless model: a fresh McpServer + transport is built per request and
 * closed when the response ends. Tools close over the authenticated user, so
 * there is no shared mutable state between members.
 */

import cors from "cors";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { assertRuntimeConfig, config } from "./config.js";
import { protectedResourceMetadata, requireAuth } from "./auth.js";
import { registerWidgets } from "./widgets.js";
import { registerTools } from "./tools/index.js";

assertRuntimeConfig();

const app = express();
app.use(
  cors({
    origin: true,
    exposedHeaders: ["Mcp-Session-Id", "WWW-Authenticate"],
    allowedHeaders: ["Content-Type", "Authorization", "Mcp-Session-Id", "Mcp-Protocol-Version"],
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/healthz", (_req, res) => res.json({ ok: true, mock: config.backend.useMock }));

app.get("/.well-known/oauth-protected-resource", (_req, res) => {
  res.json(protectedResourceMetadata());
});
// Some clients probe the path-suffixed variant.
app.get("/.well-known/oauth-protected-resource/mcp", (_req, res) => {
  res.json(protectedResourceMetadata());
});

app.post("/mcp", requireAuth, async (req, res) => {
  const server = new McpServer(
    { name: "lopning-och-livet", version: "0.1.0" },
    { capabilities: { tools: {}, resources: {} } },
  );

  registerWidgets(server);
  registerTools(server, req.authCtx!);

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("MCP request failed:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

// Streamable HTTP GET/DELETE are only needed for stateful sessions.
app.all("/mcp", (_req, res) => {
  res.status(405).set("Allow", "POST").json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed. Use POST." },
    id: null,
  });
});

app.listen(config.port, () => {
  console.log(`Löpning & Livet Apps SDK server on :${config.port}`);
  console.log(`  MCP endpoint     ${config.publicBaseUrl}/mcp`);
  console.log(`  Auth             ${config.auth.disabled ? "DISABLED (dev)" : config.auth.issuer}`);
  console.log(`  Backend          ${config.backend.useMock ? "MOCK data" : config.backend.apiBaseUrl}`);
});
