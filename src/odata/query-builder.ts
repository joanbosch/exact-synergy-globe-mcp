import type { ExactEntity } from "../catalog/catalog-types.js";
import type { Filter } from "./filter-schema.js";
import { buildFilter } from "./filter-builder.js";

export type EntityQuery = Readonly<{
  select?: string[];
  filter?: Filter;
  orderBy?: { field: string; direction?: "asc" | "desc" }[];
  limit?: number;
  skip?: number;
}>;

function assertProperties(entity: ExactEntity, names: readonly string[]): void {
  const known = new Set(entity.properties.map((property) => property.name));
  const unknown = names.filter((name) => !known.has(name));
  if (unknown.length > 0)
    throw new Error(
      `Unknown properties for '${entity.name}': ${unknown.join(", ")}`,
    );
}

export function buildQuery(
  entity: ExactEntity,
  query: EntityQuery,
  maxPageSize: number,
): URLSearchParams {
  const parameters = new URLSearchParams();
  if (query.select?.length) {
    assertProperties(entity, query.select);
    parameters.set("$select", query.select.join(","));
  }
  if (query.filter)
    parameters.set("$filter", buildFilter(query.filter, entity));
  if (query.orderBy?.length) {
    assertProperties(
      entity,
      query.orderBy.map((item) => item.field),
    );
    parameters.set(
      "$orderby",
      query.orderBy
        .map(({ field, direction = "asc" }) => `${field} ${direction}`)
        .join(","),
    );
  }
  const limit = Math.min(query.limit ?? maxPageSize, maxPageSize);
  if (!Number.isSafeInteger(limit) || limit < 1)
    throw new Error("limit must be a positive integer");
  parameters.set("$top", String(limit));
  if (query.skip !== undefined) {
    if (!Number.isSafeInteger(query.skip) || query.skip < 0)
      throw new Error("skip must be a non-negative integer");
    parameters.set("$skip", String(query.skip));
  }
  return parameters;
}
