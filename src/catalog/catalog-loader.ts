import type { ExactConfig } from "../config/types.js";
import type { ExactClient } from "../exact/client.js";
import type { Logger } from "../observability/logger.js";
import { parseMetadata } from "../odata/metadata-parser.js";
import { type ExactCatalog } from "./catalog-types.js";
import { MetadataCache } from "./metadata-cache.js";

export class CatalogLoader {
  private catalog: ExactCatalog | undefined;
  private loading: Promise<ExactCatalog> | undefined;
  private readonly cache: MetadataCache;

  public constructor(
    private readonly config: ExactConfig,
    private readonly client: ExactClient,
    private readonly logger: Logger,
  ) {
    this.cache = new MetadataCache(config.operation.metadataCachePath);
  }

  public async load(refresh = false): Promise<ExactCatalog> {
    if (!refresh && this.catalog) return this.catalog;
    if (!refresh && this.loading) return this.loading;
    this.loading = this.loadInternal();
    try {
      this.catalog = await this.loading;
      return this.catalog;
    } finally {
      this.loading = undefined;
    }
  }

  private async loadInternal(): Promise<ExactCatalog> {
    if (!this.client.configured) {
      return {
        product: this.config.connection.kind,
        source: "unconfigured",
        loadedAt: new Date().toISOString(),
        entities: [],
        actions: [],
        capabilities: {
          connectivity: "unavailable",
          metadata: "unavailable",
          entityRead: "unavailable",
          actions: "unavailable",
        },
      };
    }
    try {
      const metadataUrl = this.client.metadataUrl().href;
      const catalog = parseMetadata(
        await this.client.metadata(),
        this.config.connection.kind,
        metadataUrl,
      );
      try {
        await this.cache.write(catalog);
      } catch (error) {
        this.logger.warn("Could not update optional metadata cache", {
          error: error instanceof Error ? error.message : "unknown",
        });
      }
      return catalog;
    } catch (error) {
      const cached = await this.cache.read();
      if (cached) {
        this.logger.warn("Live metadata unavailable; using configured cache", {
          source: "cache",
        });
        return cached;
      }
      throw error;
    }
  }
}
