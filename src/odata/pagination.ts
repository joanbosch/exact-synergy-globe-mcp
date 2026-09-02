export function encodeCursor(url: string): string {
  return Buffer.from(url, "utf8").toString("base64url");
}

export function decodeCursor(cursor: string, baseUrl: URL): URL {
  let decoded: URL;
  try {
    decoded = new URL(
      Buffer.from(cursor, "base64url").toString("utf8"),
      baseUrl,
    );
  } catch {
    throw new Error("Invalid continuation cursor");
  }
  if (
    decoded.origin !== baseUrl.origin ||
    !decoded.pathname.startsWith(baseUrl.pathname)
  ) {
    throw new Error(
      "Continuation cursor does not belong to the configured Exact API",
    );
  }
  return decoded;
}
