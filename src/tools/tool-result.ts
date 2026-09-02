import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { redact } from "../observability/redaction.js";

export function success(value: unknown): CallToolResult {
  const safe = redact(value);
  return { content: [{ type: "text", text: JSON.stringify(safe, null, 2) }] };
}

export function failure(error: unknown): CallToolResult {
  const message =
    error instanceof Error ? error.message : "Unexpected server error";
  return {
    isError: true,
    content: [{ type: "text", text: String(redact(message)) }],
  };
}

export async function safely<T>(
  operation: () => Promise<T> | T,
): Promise<CallToolResult> {
  try {
    return success(await operation());
  } catch (error) {
    return failure(error);
  }
}
