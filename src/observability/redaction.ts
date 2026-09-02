const SENSITIVE_KEY =
  /(?:password|secret|token|authorization|cookie|credential)/i;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[truncated]";
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SENSITIVE_KEY.test(key) ? "[redacted]" : redact(item, depth + 1),
      ]),
    );
  }
  if (typeof value === "string") {
    return value
      .replace(/(Basic|Bearer|NTLM)\s+[A-Za-z0-9+/=._~-]+/gi, "$1 [redacted]")
      .replace(/([?&](?:access_token|token|password)=)[^&]+/gi, "$1[redacted]");
  }
  return value;
}
