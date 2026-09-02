import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { startServer } from "./helpers.mjs";

describe("MCP contract (mock backend, auth disabled)", () => {
  let server;
  let client;

  before(async () => {
    server = await startServer();
    client = new Client({ name: "contract-test", version: "1.0.0" });
    await client.connect(new StreamableHTTPClientTransport(new URL(server.url)));
  });

  after(async () => {
    await client?.close();
    await server?.stop();
  });

  test("lists the four expected tools", async () => {
    const { tools } = await client.listTools();
    assert.deepEqual(
      tools.map((t) => t.name).sort(),
      ["apply_proposal", "propose_add_workout", "show_training_log", "show_training_week"],
    );
  });

  test("every widget tool's outputTemplate points at a registered resource", async () => {
    const { tools } = await client.listTools();
    const { resources } = await client.listResources();
    const uris = new Set(resources.map((r) => r.uri));

    for (const tool of tools) {
      const uri = tool._meta?.["openai/outputTemplate"];
      if (!uri) continue;
      assert.ok(uris.has(uri), `${tool.name} -> ${uri} is not a registered resource`);
    }
  });

  test("widget resources are skybridge HTML that mount the widget root", async () => {
    for (const uri of [
      "ui://widget/week.html",
      "ui://widget/training-log.html",
      "ui://widget/proposal.html",
    ]) {
      const { contents } = await client.readResource({ uri });
      assert.equal(contents[0].mimeType, "text/html+skybridge");
      assert.match(contents[0].text, /lopning-livet-root/);
      assert.match(contents[0].text, /<script type="module">/);
    }
  });

  test("show_training_week returns a 7-day structured schedule", async () => {
    const res = await client.callTool({
      name: "show_training_week",
      arguments: { which: "this" },
    });
    assert.equal(res.isError ?? false, false);
    const week = res.structuredContent;
    assert.equal(week.days.length, 7);
    assert.ok(week.programName);
    assert.ok(Array.isArray(week.days[0].workouts));
    assert.match(res.content[0].text, /vecka/i);
  });

  test("show_training_log returns entries and numeric totals", async () => {
    const res = await client.callTool({
      name: "show_training_log",
      arguments: { days: 30 },
    });
    const log = res.structuredContent;
    assert.ok(Array.isArray(log.entries));
    assert.equal(typeof log.totalDistanceKm, "number");
    assert.equal(typeof log.totalDurationMin, "number");
  });

  test("show_training_log rejects out-of-range input via schema", async () => {
    const res = await client
      .callTool({ name: "show_training_log", arguments: { days: 999 } })
      .catch((err) => ({ isError: true, content: [{ text: String(err) }] }));
    assert.equal(res.isError, true);
  });

  test("propose_add_workout creates a pending proposal, apply_proposal applies it", async () => {
    const proposed = await client.callTool({
      name: "propose_add_workout",
      arguments: { date: "2026-09-10", type: "Tröskel", distanceKm: 8 },
    });
    assert.equal(proposed.structuredContent.status, "pending_confirmation");
    const id = proposed.structuredContent.proposalId;
    assert.ok(id);

    const applied = await client.callTool({
      name: "apply_proposal",
      arguments: { proposalId: id },
    });
    assert.equal(applied.structuredContent.status, "applied");
  });

  test("unknown tool is rejected", async () => {
    const res = await client
      .callTool({ name: "does_not_exist", arguments: {} })
      .catch((err) => ({ isError: true, content: [{ text: String(err) }] }));
    assert.equal(res.isError, true);
  });
});

describe("OAuth gate (auth enabled)", () => {
  let server;

  before(async () => {
    server = await startServer({
      AUTH_DISABLED: "false",
      OAUTH_ISSUER: "https://auth.example.test",
      OAUTH_JWKS_URL: "https://auth.example.test/.well-known/jwks.json",
      OAUTH_AUDIENCE: "http://localhost:0",
    });
  });

  after(async () => {
    await server?.stop();
  });

  test("POST /mcp without a token -> 401 + WWW-Authenticate pointing at resource metadata", async () => {
    const res = await fetch(server.url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    });
    assert.equal(res.status, 401);
    assert.match(res.headers.get("www-authenticate") ?? "", /oauth-protected-resource/);
  });

  test("resource metadata advertises the authorization server", async () => {
    const res = await fetch(`${server.base}/.well-known/oauth-protected-resource`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.authorization_servers, ["https://auth.example.test"]);
    assert.ok(body.scopes_supported.includes("training:write"));
  });
});
