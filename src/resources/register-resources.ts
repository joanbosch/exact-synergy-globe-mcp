import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CatalogLoader } from "../catalog/catalog-loader.js";
import { capabilities } from "../catalog/capability-resolver.js";
import type { ExactConfig } from "../config/types.js";
import type { AccessPolicy } from "../policy/access-policy.js";

const json = (uri: URL, value: unknown) => ({
  contents: [
    {
      uri: uri.href,
      mimeType: "application/json",
      text: JSON.stringify(value, null, 2),
    },
  ],
});

export function registerResources(
  server: McpServer,
  loader: CatalogLoader,
  config: ExactConfig,
  policy: AccessPolicy,
): void {
  server.registerResource(
    "Exact products",
    "exact://products",
    {
      description: "Configured product and metadata source without secrets",
      mimeType: "application/json",
    },
    async (uri) => {
      const catalog = await loader.load();
      return json(uri, {
        configured: config.connection.configured,
        requested: config.connection.kind,
        detected: catalog.product,
        source: catalog.source,
      });
    },
  );
  server.registerResource(
    "Exact capabilities",
    "exact://capabilities",
    {
      description: "Capabilities detected or verified against Exact",
      mimeType: "application/json",
    },
    async (uri) => json(uri, capabilities(await loader.load())),
  );
  server.registerResource(
    "Effective Exact policies",
    "exact://policies",
    {
      description: "Effective read/write policy without connection secrets",
      mimeType: "application/json",
    },
    (uri) => json(uri, policy.summary()),
  );

  for (const product of ["synergy", "globe"] as const) {
    server.registerResource(
      `${product} entities`,
      `exact://${product}/entities`,
      {
        description: `Allowed ${product} entity summaries from live metadata`,
        mimeType: "application/json",
      },
      async (uri) => {
        const catalog = await loader.load();
        const entities =
          catalog.product === "auto" || catalog.product === product
            ? catalog.entities
                .filter((entity) => policy.canReadEntity(entity))
                .map(({ name, setName, keys }) => ({ name, setName, keys }))
            : [];
        return json(uri, entities);
      },
    );
    server.registerResource(
      `${product} entity schema`,
      new ResourceTemplate(`exact://${product}/entities/{name}`, {
        list: async () => {
          const catalog = await loader.load();
          return {
            resources: catalog.entities
              .filter((entity) => policy.canReadEntity(entity))
              .map((entity) => ({
                uri: `exact://${product}/entities/${encodeURIComponent(entity.name)}`,
                name: entity.name,
                mimeType: "application/json",
              })),
          };
        },
        complete: {
          name: async (value) =>
            (await loader.load()).entities
              .filter(
                (entity) =>
                  policy.canReadEntity(entity) &&
                  entity.name
                    .toLocaleLowerCase()
                    .startsWith(value.toLocaleLowerCase()),
              )
              .slice(0, 100)
              .map((entity) => entity.name),
        },
      }),
      {
        description: `Full schema for one allowed ${product} entity`,
        mimeType: "application/json",
      },
      async (uri, { name }) => {
        const catalog = await loader.load();
        const resolvedName = Array.isArray(name) ? name[0] : name;
        const entity = catalog.entities.find(
          (item) => item.name === resolvedName || item.setName === resolvedName,
        );
        if (!entity || !policy.canReadEntity(entity))
          throw new Error(
            `Entity '${resolvedName ?? ""}' was not found or is not allowed`,
          );
        return json(uri, entity);
      },
    );
  }
}
