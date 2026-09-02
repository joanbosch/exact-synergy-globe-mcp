import type { ExactCatalog } from "@catalog/catalog-types.js";

export function capabilities(catalog: ExactCatalog): Record<string, unknown> {
  return {
    product: catalog.product,
    source: catalog.source,
    loadedAt: catalog.loadedAt,
    statuses: catalog.capabilities,
    counts: {
      entities: catalog.entities.length,
      publicActions: catalog.actions.filter((action) => action.public).length,
    },
  };
}
