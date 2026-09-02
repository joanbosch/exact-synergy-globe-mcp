# Exact Synergy & Globe MCP

A generic, metadata-driven [Model Context Protocol](https://modelcontextprotocol.io/) server for Exact Synergy Enterprise and Exact Globe+. One process connects to one Exact Entity Services endpoint; run multiple processes to connect multiple installations.

The server is read-only by default. It discovers entities and public actions from the configured installation's `$metadata`, validates every entity, field, key, filter, and action against that catalog, and never accepts raw OData fragments. It does not bundle Exact's proprietary catalogs or documentation.

## Status

Version `0.1.0` provides the standalone TypeScript/stdio foundation, offline MCP discovery, live metadata parsing, safe generic reads, optional metadata caching, and policy-gated mutation/action scaffolding. Live compatibility still needs certification against each target Exact version, license, service configuration, and account permissions; see [the compatibility matrix](docs/exact-compatibility.md).

## Requirements

- Node.js 20 or newer
- An Exact REST/OData Entity Services base URL
- NTLM, Basic, or pre-issued OAuth credentials with the least privileges required

## Install and run

```bash
npm install
npm run build
node dist/index.js
```

With no `EXACT_API_BASE_URL`, the MCP server intentionally starts in offline discovery mode. `exact_get_server_info` remains available and reports that a connection is not configured. Once a base URL is set, the relevant authentication fields are mandatory and validated before MCP starts.

Example read-only client configuration:

```json
{
  "mcpServers": {
    "exact-synergy": {
      "command": "npx",
      "args": ["-y", "exact-synergy-globe-mcp@0.1.0"],
      "env": {
        "EXACT_API_BASE_URL": "https://exact.example.test/services/Exact.Entity.REST.svc/",
        "EXACT_API_KIND": "synergy",
        "EXACT_API_AUTH": "ntlm",
        "EXACT_API_DOMAIN": "EXAMPLE",
        "EXACT_API_DB_SERVER": "SQLSERVER",
        "EXACT_API_DB_NAME": "Synergy",
        "EXACT_API_USERNAME": "mcp-reader",
        "EXACT_API_PASSWORD": "provided-by-your-secret-store",
        "EXACT_READ_ONLY": "true",
        "EXACT_ALLOWED_ENTITIES": "Account,Resource,Request"
      }
    }
  }
}
```

Do not commit real URLs or credentials. Inject secrets through the launching client's environment/secret facility. See [.env.example](.env.example) and [configuration](docs/configuration.md).

## Safety model

- `stdout` is exclusively owned by MCP's stdio transport. Logs and audit events use `stderr`.
- Read-only mode is the default, and write tools are not registered while it is active.
- Enabling a write requires `EXACT_READ_ONLY=false`, the operation-specific flag, and an explicit entity/action allowlist.
- Internal-looking actions are removed from the discovered public action catalog.
- Redirects and automatic retries are disabled. A timeout or network failure after a mutable request produces an explicit unknown-outcome error.
- Create/update operations perform a read-back when Exact returns a usable key.
- Responses, logs, and failures redact credential-like keys and authorization values.
- Continuation cursors may only resolve inside the configured API origin and base path.

## Development

```bash
npm run schema:generate
npm run check
```

`npm run check` runs formatting, lint, TypeScript, unit/contract/security tests, build, and generated-schema verification. Integration tests requiring live Exact credentials are deliberately separate from the default suite.

More detail: [architecture](docs/architecture.md), [configuration](docs/configuration.md), [tools](docs/tools.md), [resources](docs/resources.md), [security](docs/security.md), and [Exact compatibility](docs/exact-compatibility.md).

## License

[MIT](LICENSE). Exact, Exact Synergy Enterprise, and Exact Globe+ are trademarks of their respective owner. This project is independent and is not endorsed by Exact.
