import { readFile } from "node:fs/promises";
import { z } from "zod";
import { catalogSchema } from "@catalog/catalog-types.js";

const path = new URL("../schemas/catalog.schema.json", import.meta.url);
const actual = await readFile(path, "utf8");
const expected = `${JSON.stringify(z.toJSONSchema(catalogSchema, { target: "draft-7", reused: "ref" }), null, 2)}\n`;
if (actual !== expected) {
  process.stderr.write(
    "schemas/catalog.schema.json is stale; run npm run schema:generate\n",
  );
  process.exitCode = 1;
}
