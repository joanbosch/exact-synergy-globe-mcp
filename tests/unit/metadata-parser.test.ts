import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseMetadata } from "../../src/odata/metadata-parser.js";

describe("metadata parser", () => {
  it("normalizes entity sets, keys, fields, and public actions", async () => {
    const xml = await readFile(
      new URL("../fixtures/metadata.xml", import.meta.url),
      "utf8",
    );
    const catalog = parseMetadata(
      xml,
      "synergy",
      "https://exact.example.test/$metadata",
    );
    expect(catalog.entities).toHaveLength(2);
    expect(catalog.entities[0]).toMatchObject({
      name: "Account",
      setName: "Accounts",
      keys: ["ID"],
    });
    expect(
      catalog.actions.find((action) => action.name === "ApproveRequest")
        ?.public,
    ).toBe(true);
    expect(
      catalog.actions.find((action) => action.name === "InternalMaintenance")
        ?.public,
    ).toBe(false);
    expect(
      catalog.actions.find((action) => action.name === "RequestFlowApprove")
        ?.method,
    ).toBe("POST");
  });

  it("rejects a document without EDM schemas", () => {
    expect(() => parseMetadata("<html>not metadata</html>", "auto")).toThrow(
      /Entity Data Model/,
    );
  });
});
