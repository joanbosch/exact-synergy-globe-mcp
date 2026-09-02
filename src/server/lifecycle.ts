import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Logger } from "../observability/logger.js";

export function installLifecycle(
  server: McpServer,
  logger: Logger,
): () => void {
  let closing = false;
  const close = () => {
    if (closing) return;
    closing = true;
    void server.close().catch((error: unknown) =>
      logger.error("Failed to close MCP server", {
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
  };
  const onSigint = () => close();
  const onSigterm = () => close();
  const onStdinEnd = () => close();
  process.once("SIGINT", onSigint);
  process.once("SIGTERM", onSigterm);
  process.stdin.once("end", onStdinEnd);
  return () => {
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
    process.stdin.off("end", onStdinEnd);
  };
}
