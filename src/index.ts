#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "@config/env.js";
import { createLogger } from "@observability/logger.js";
import { createServer } from "@server/create-server.js";
import { installLifecycle } from "@server/lifecycle.js";

export async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.operation.logLevel);
  const server = createServer(config, logger);
  installLifecycle(server, logger);
  await server.connect(new StdioServerTransport());
  logger.info("Exact Synergy & Globe MCP started", {
    configured: config.connection.configured,
    product: config.connection.kind,
    readOnly: config.policy.readOnly,
  });
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === `file://${entryPath}`) {
  main().catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Unexpected startup error";
    process.stderr.write(`${JSON.stringify({ level: "error", message })}\n`);
    process.exitCode = 1;
  });
}
