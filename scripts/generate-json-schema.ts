import { mkdir, writeFile } from "node:fs/promises";
import { z } from "zod";
import { catalogSchema } from "../src/catalog/catalog-types.js";

const output = new URL("../schemas/catalog.schema.json", import.meta.url);
await mkdir(new URL("../schemas/", import.meta.url), { recursive: true });
await writeFile(
  output,
  `${JSON.stringify(z.toJSONSchema(catalogSchema, { target: "draft-7", reused: "ref" }), null, 2)}\n`,
  "utf8",
);
