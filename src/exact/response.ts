export type ODataCollection = Readonly<{
  records: unknown[];
  nextLink?: string;
}>;

export function parseCollection(data: unknown): ODataCollection {
  if (Array.isArray(data)) return { records: data };
  if (!data || typeof data !== "object") return { records: [] };
  const root = data as Record<string, unknown>;
  const d =
    root.d && typeof root.d === "object"
      ? (root.d as Record<string, unknown>)
      : root;
  const records = Array.isArray(d.results)
    ? d.results
    : Array.isArray(d.value)
      ? d.value
      : [];
  const next = d.__next ?? d["@odata.nextLink"] ?? root["@odata.nextLink"];
  return {
    records,
    ...(typeof next === "string" && next.length > 0 ? { nextLink: next } : {}),
  };
}

export function unwrapRecord(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  const root = data as Record<string, unknown>;
  return root.d ?? root.value ?? data;
}
