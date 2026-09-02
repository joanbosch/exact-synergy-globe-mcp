import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CatalogLoader } from "../catalog/catalog-loader.js";
import type { ExactConfig } from "../config/types.js";
import { ExactClient } from "../exact/client.js";
import { ExactService } from "../exact/service.js";
import { AuditLogger } from "../observability/audit.js";
import type { Logger } from "../observability/logger.js";
import { AccessPolicy } from "../policy/access-policy.js";
import { registerResources } from "../resources/register-resources.js";
import { registerTools } from "../tools/register-tools.js";
import { SERVER_NAME, SERVER_VERSION } from "./capabilities.js";

export type ServerDependencies = Readonly<{
  exactClient?: ExactClient;
  catalogLoader?: CatalogLoader;
}>;

export function createServer(
  config: ExactConfig,
  logger: Logger,
  dependencies: ServerDependencies = {},
): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  const client = dependencies.exactClient ?? new ExactClient(config, logger);
  const loader =
    dependencies.catalogLoader ?? new CatalogLoader(config, client, logger);
  const policy = new AccessPolicy(config.policy);
  const service = new ExactService(
    config,
    client,
    loader,
    policy,
    new AuditLogger(logger),
  );
  registerTools(server, service, config, policy);
  registerResources(server, loader, config, policy);
  return server;
}
