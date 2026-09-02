# Architecture

The package is one modular TypeScript application. MCP-specific code composes lower-level services; Exact, catalog, OData, policy, and observability code do not import MCP.

```text
stdio -> server -> tools/resources -> ExactService
                                  |-> CatalogLoader -> $metadata parser/cache
                                  |-> AccessPolicy
                                  `-> ExactClient -> Basic/OAuth/NTLM -> Exact
```

`src/config` is the only layer that reads environment variables. `ExactClient` owns URL containment, authentication, timeouts, response-size limits, no-redirect behavior, safe HTTP error normalization, and the `ServerName`/`DatabaseName` headers used by configured Exact APIs. It never retries.

`CatalogLoader` requests `$metadata`, normalizes EDM entity types, sets, keys, properties, functions, and actions, then stores only that technical model in memory. A configured local cache may be used when live metadata fails. No static Exact catalog is shipped.

`ExactService` is transport-independent application logic. It resolves catalog objects, applies policy, builds safe OData, performs reads and mutations, verifies mutable results where possible, and emits audit events. MCP tools are thin adapters that return recoverable failures as `isError` results.

The configured base URL is the Entity Services root. Product-specific action and Flow routes vary between Exact versions; execution is therefore limited to operations found in live metadata and explicitly allowlisted.
