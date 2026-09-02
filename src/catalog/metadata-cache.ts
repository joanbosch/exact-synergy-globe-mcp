import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { catalogSchema, type ExactCatalog } from "./catalog-types.js";

export class MetadataCache {
  public constructor(private readonly path: string | undefined) {}

  public async read(): Promise<ExactCatalog | undefined> {
    if (!this.path) return undefined;
    try {
      const parsed: unknown = JSON.parse(await readFile(this.path, "utf8"));
      const catalog = catalogSchema.parse(parsed);
      return { ...catalog, source: "cache" };
    } catch {
      return undefined;
    }
  }

  public async write(catalog: ExactCatalog): Promise<void> {
    if (!this.path) return;
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    const temporary = `${this.path}.${String(process.pid)}.tmp`;
    await writeFile(temporary, `${JSON.stringify(catalog, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(temporary, this.path);
  }
}
