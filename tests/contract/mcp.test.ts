import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "@config/env.js";
import { createLogger } from "@observability/logger.js";
import { createServer } from "@server/create-server.js";

const closeables: { close: () => Promise<void> }[] = [];
afterEach(async () =>
  Promise.all(closeables.splice(0).map((item) => item.close())),
);

describe("MCP contract", () => {
  it("initializes offline, advertises safe tools/resources, and omits writes", async () => {
    const server = createServer(
      loadConfig({ EXACT_LOG_LEVEL: "silent" }),
      createLogger("silent"),
    );
    const client = new Client({ name: "contract-test", version: "1.0.0" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    closeables.push(client, server);
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toContain(
      "exact_get_server_info",
    );
    expect(tools.tools.map((tool) => tool.name)).not.toContain(
      "exact_create_entity",
    );
    expect(tools.tools.map((tool) => tool.name)).not.toContain(
      "exact_execute_action",
    );

    const resources = await client.listResources();
    expect(resources.resources.map((resource) => resource.uri)).toContain(
      "exact://capabilities",
    );
    const result = (await client.callTool({
      name: "exact_get_server_info",
      arguments: {},
    })) as CallToolResult;
    expect(result.isError).not.toBe(true);
    const first = result.content[0];
    expect(first?.type).toBe("text");
    expect(first?.type === "text" ? JSON.parse(first.text) : {}).toMatchObject({
      configured: false,
      connected: false,
    });
  });

  it("registers only individually enabled write tools for a configured connection", async () => {
    const config = loadConfig({
      EXACT_API_BASE_URL: "https://exact.example.test/entity/",
      EXACT_API_AUTH: "basic",
      EXACT_API_USERNAME: "reader",
      EXACT_API_PASSWORD: "secret",
      EXACT_READ_ONLY: "false",
      EXACT_ALLOWED_ENTITIES: "Account",
      EXACT_ALLOW_CREATE: "true",
      EXACT_LOG_LEVEL: "silent",
    });
    const server = createServer(config, createLogger("silent"));
    const client = new Client({
      name: "write-contract-test",
      version: "1.0.0",
    });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    closeables.push(client, server);
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
    const names = (await client.listTools()).tools.map((tool) => tool.name);
    expect(names).toContain("exact_create_entity");
    expect(names).not.toContain("exact_update_entity");
    expect(names).not.toContain("exact_delete_entity");
    expect(names).not.toContain("exact_execute_action");
  });
});
