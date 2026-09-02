import type { ExactEntity, ExactProperty } from "../catalog/catalog-types.js";
import type { Filter } from "./filter-schema.js";

function property(entity: ExactEntity, name: string): ExactProperty {
  const match = entity.properties.find((item) => item.name === name);
  if (!match)
    throw new Error(`Unknown property '${name}' for entity '${entity.name}'`);
  return match;
}

function literal(value: unknown, type: string): string {
  if (value === null) return "null";
  if (/Boolean$/i.test(type)) {
    if (typeof value !== "boolean")
      throw new Error(`Expected a boolean value for ${type}`);
    return String(value);
  }
  if (/(?:Byte|Int16|Int32|Int64|Decimal|Double|Single)$/i.test(type)) {
    if (typeof value !== "number" || !Number.isFinite(value))
      throw new Error(`Expected a numeric value for ${type}`);
    return String(value);
  }
  if (/Guid$/i.test(type)) {
    if (
      typeof value !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      )
    ) {
      throw new Error("Expected a valid GUID value");
    }
    return `guid'${value}'`;
  }
  if (/(?:DateTime|DateTimeOffset)$/i.test(type)) {
    if (typeof value !== "string" || Number.isNaN(Date.parse(value)))
      throw new Error(`Expected an ISO date value for ${type}`);
    return `datetime'${value.replace(/'/g, "''")}'`;
  }
  if (typeof value !== "string")
    throw new Error(`Expected a string value for ${type}`);
  return `'${value.replace(/'/g, "''")}'`;
}

export function buildFilter(
  filter: Filter,
  entity: ExactEntity,
  depth = 0,
): string {
  if (depth > 8) throw new Error("Filter nesting is too deep");
  if ("filters" in filter) {
    return `(${filter.filters.map((item) => buildFilter(item, entity, depth + 1)).join(` ${filter.op} `)})`;
  }
  if (filter.op === "not")
    return `not (${buildFilter(filter.filter, entity, depth + 1)})`;
  const field = property(entity, filter.field);
  if (
    filter.op === "contains" ||
    filter.op === "startsWith" ||
    filter.op === "endsWith"
  ) {
    if (!/String$/i.test(field.type))
      throw new Error(`${filter.op} is only valid for string properties`);
    const escaped = literal(filter.value, field.type);
    if (filter.op === "contains")
      return `substringof(${escaped},${field.name}) eq true`;
    const fn = filter.op === "startsWith" ? "startswith" : "endswith";
    return `${fn}(${field.name},${escaped}) eq true`;
  }
  return `${field.name} ${filter.op} ${literal(filter.value, field.type)}`;
}
