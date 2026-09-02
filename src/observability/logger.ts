import type { LogLevel } from "@config/types.js";
import { redact } from "@observability/redaction.js";

const PRIORITY: Record<Exclude<LogLevel, "silent">, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export type Logger = Readonly<{
  debug: (message: string, context?: unknown) => void;
  info: (message: string, context?: unknown) => void;
  warn: (message: string, context?: unknown) => void;
  error: (message: string, context?: unknown) => void;
}>;

export function createLogger(level: LogLevel): Logger {
  const write = (
    entryLevel: Exclude<LogLevel, "silent">,
    message: string,
    context?: unknown,
  ) => {
    if (level === "silent" || PRIORITY[entryLevel] < PRIORITY[level]) return;
    const entry = {
      time: new Date().toISOString(),
      level: entryLevel,
      message,
      ...(context === undefined ? {} : { context: redact(context) }),
    };
    process.stderr.write(`${JSON.stringify(entry)}\n`);
  };
  return {
    debug: (message, context) => write("debug", message, context),
    info: (message, context) => write("info", message, context),
    warn: (message, context) => write("warn", message, context),
    error: (message, context) => write("error", message, context),
  };
}
