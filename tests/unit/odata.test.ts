import { describe, expect, it } from "vitest";
import type { ExactEntity } from "../../src/catalog/catalog-types.js";
import { buildFilter } from "../../src/odata/filter-builder.js";
import { buildQuery } from "../../src/odata/query-builder.js";

const entity: ExactEntity = {
  name: "Account",
  setName: "Accounts",
  namespace: "Exact.Test",
  keys: ["ID"],
  properties: [
    { name: "ID", type: "Edm.Guid", nullable: false },
    { name: "AccountName", type: "Edm.String", nullable: false },
    { name: "Active", type: "Edm.Boolean", nullable: false },
  ],
  readable: true,
  writable: false,
};

describe("safe OData construction", () => {
  it("escapes values and emits structured string operations", () => {
    expect(
      buildFilter(
        { field: "AccountName", op: "contains", value: "O'Brien" },
        entity,
      ),
    ).toBe("substringof('O''Brien',AccountName) eq true");
  });

  it("rejects unknown fields instead of accepting raw OData", () => {
    expect(() =>
      buildFilter(
        { field: "Name) or true or (Name", op: "eq", value: "x" },
        entity,
      ),
    ).toThrow(/Unknown property/);
  });

  it("caps page size and validates selected fields", () => {
    const query = buildQuery(entity, { select: ["ID"], limit: 999 }, 100);
    expect(query.get("$top")).toBe("100");
    expect(() => buildQuery(entity, { select: ["Secret"] }, 100)).toThrow(
      /Unknown properties/,
    );
  });
});
