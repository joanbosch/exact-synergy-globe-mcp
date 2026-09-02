import type { Logger } from "@observability/logger.js";

export type AuditEvent = Readonly<{
  operation: string;
  target: string;
  outcome: "succeeded" | "failed" | "unknown" | "denied";
  identifier?: string;
}>;

export class AuditLogger {
  public constructor(private readonly logger: Logger) {}

  public record(event: AuditEvent): void {
    this.logger.info("mutable operation audit", event);
  }
}
