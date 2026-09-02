import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const positiveInt = (fallback: number, maximum: number) =>
  z.coerce.number().int().positive().max(maximum).default(fallback);

const optionalNonEmpty = z.string().trim().min(1).optional();

export const environmentSchema = z.object({
  EXACT_API_BASE_URL: optionalNonEmpty,
  EXACT_API_KIND: z.enum(["auto", "synergy", "globe"]).default("auto"),
  EXACT_API_AUTH: z.enum(["ntlm", "basic", "oauth"]).default("ntlm"),
  EXACT_API_DOMAIN: optionalNonEmpty,
  EXACT_API_DB_SERVER: optionalNonEmpty,
  EXACT_API_DB_NAME: optionalNonEmpty,
  EXACT_API_USERNAME: optionalNonEmpty,
  EXACT_API_PASSWORD: optionalNonEmpty,
  EXACT_API_ACCESS_TOKEN: optionalNonEmpty,
  EXACT_API_ACCESS_TOKEN_TYPE: z.string().trim().min(1).default("Bearer"),
  EXACT_READ_ONLY: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  EXACT_ALLOWED_ENTITIES: optionalNonEmpty,
  EXACT_ALLOWED_ACTIONS: optionalNonEmpty,
  EXACT_ALLOW_CREATE: booleanString,
  EXACT_ALLOW_UPDATE: booleanString,
  EXACT_ALLOW_DELETE: booleanString,
  EXACT_ALLOW_EXECUTE_ACTION: booleanString,
  EXACT_REQUEST_TIMEOUT_MS: positiveInt(30_000, 300_000),
  EXACT_MAX_PAGE_SIZE: positiveInt(100, 1_000),
  EXACT_MAX_RESPONSE_BYTES: positiveInt(5_000_000, 50_000_000),
  EXACT_MAX_CONTINUATION_PAGES: positiveInt(10, 100),
  EXACT_LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error", "silent"])
    .default("info"),
  EXACT_METADATA_CACHE_PATH: optionalNonEmpty,
});

export type ParsedEnvironment = z.infer<typeof environmentSchema>;
