import { environmentSchema, type ParsedEnvironment } from "./schema.js";
import type { ExactConfig } from "./types.js";

const SECRET_VARIABLES = new Set([
  "EXACT_API_PASSWORD",
  "EXACT_API_ACCESS_TOKEN",
]);

function parseCsv(value: string | undefined): ReadonlySet<string> | undefined {
  if (value === undefined) return undefined;
  const values = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return values.length > 0 ? new Set(values) : undefined;
}

function required(
  env: ParsedEnvironment,
  names: readonly (keyof ParsedEnvironment)[],
): void {
  const missing = names.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}`,
    );
  }
}

function parseBaseUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("EXACT_API_BASE_URL must be a valid absolute URL");
  }
  if (!new Set(["http:", "https:"]).has(url.protocol)) {
    throw new Error("EXACT_API_BASE_URL must use http or https");
  }
  if (url.username || url.password) {
    throw new Error("EXACT_API_BASE_URL must not contain credentials");
  }
  url.hash = "";
  return url;
}

export function loadConfig(
  source: NodeJS.ProcessEnv = process.env,
): ExactConfig {
  const selected = Object.fromEntries(
    Object.entries(source).filter(([name]) => name.startsWith("EXACT_")),
  );
  const parsed = environmentSchema.safeParse(selected);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((issue) => {
      const name = issue.path.join(".");
      return `${name}: ${issue.message}`;
    });
    throw new Error(`Invalid Exact configuration: ${messages.join("; ")}`);
  }

  const env = parsed.data;
  const configured = env.EXACT_API_BASE_URL !== undefined;
  if (configured) {
    if (env.EXACT_API_AUTH === "ntlm") {
      required(env, [
        "EXACT_API_DOMAIN",
        "EXACT_API_DB_SERVER",
        "EXACT_API_DB_NAME",
        "EXACT_API_USERNAME",
        "EXACT_API_PASSWORD",
      ]);
    } else if (env.EXACT_API_AUTH === "basic") {
      required(env, ["EXACT_API_USERNAME", "EXACT_API_PASSWORD"]);
    } else {
      required(env, ["EXACT_API_ACCESS_TOKEN"]);
    }
  }

  const anyWriteFlag =
    env.EXACT_ALLOW_CREATE ||
    env.EXACT_ALLOW_UPDATE ||
    env.EXACT_ALLOW_DELETE ||
    env.EXACT_ALLOW_EXECUTE_ACTION;
  if (env.EXACT_READ_ONLY && anyWriteFlag) {
    throw new Error("Write flags cannot be enabled while EXACT_READ_ONLY=true");
  }
  const allowedEntities = parseCsv(env.EXACT_ALLOWED_ENTITIES);
  const allowedActions = parseCsv(env.EXACT_ALLOWED_ACTIONS);

  return {
    connection: {
      configured,
      ...(configured ? { baseUrl: parseBaseUrl(env.EXACT_API_BASE_URL!) } : {}),
      kind: env.EXACT_API_KIND,
      auth: env.EXACT_API_AUTH,
      ...(env.EXACT_API_DOMAIN ? { domain: env.EXACT_API_DOMAIN } : {}),
      ...(env.EXACT_API_DB_SERVER ? { dbServer: env.EXACT_API_DB_SERVER } : {}),
      ...(env.EXACT_API_DB_NAME ? { dbName: env.EXACT_API_DB_NAME } : {}),
      ...(env.EXACT_API_USERNAME ? { username: env.EXACT_API_USERNAME } : {}),
      ...(env.EXACT_API_PASSWORD ? { password: env.EXACT_API_PASSWORD } : {}),
      ...(env.EXACT_API_ACCESS_TOKEN
        ? { accessToken: env.EXACT_API_ACCESS_TOKEN }
        : {}),
      accessTokenType: env.EXACT_API_ACCESS_TOKEN_TYPE,
    },
    policy: {
      readOnly: env.EXACT_READ_ONLY,
      ...(allowedEntities ? { allowedEntities } : {}),
      ...(allowedActions ? { allowedActions } : {}),
      allowCreate: env.EXACT_ALLOW_CREATE,
      allowUpdate: env.EXACT_ALLOW_UPDATE,
      allowDelete: env.EXACT_ALLOW_DELETE,
      allowExecuteAction: env.EXACT_ALLOW_EXECUTE_ACTION,
    },
    operation: {
      requestTimeoutMs: env.EXACT_REQUEST_TIMEOUT_MS,
      maxPageSize: env.EXACT_MAX_PAGE_SIZE,
      maxResponseBytes: env.EXACT_MAX_RESPONSE_BYTES,
      maxContinuationPages: env.EXACT_MAX_CONTINUATION_PAGES,
      logLevel: env.EXACT_LOG_LEVEL,
      ...(env.EXACT_METADATA_CACHE_PATH
        ? { metadataCachePath: env.EXACT_METADATA_CACHE_PATH }
        : {}),
    },
  };
}

export function safeEnvironmentSummary(
  source: NodeJS.ProcessEnv = process.env,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(source)
      .filter(([name]) => name.startsWith("EXACT_"))
      .map(([name, value]) => [
        name,
        SECRET_VARIABLES.has(name) && value ? "[configured]" : (value ?? ""),
      ]),
  );
}
