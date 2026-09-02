# Configuration

Configuration is read once, before stdio is opened. Error messages name invalid or missing variables but never include their values.

## Connection

| Variable                      | Default  | Meaning                                                          |
| ----------------------------- | -------- | ---------------------------------------------------------------- |
| `EXACT_API_BASE_URL`          | unset    | Exact Entity Services root. When unset, the server runs offline. |
| `EXACT_API_KIND`              | `auto`   | `auto`, `synergy`, or `globe`.                                   |
| `EXACT_API_AUTH`              | `ntlm`   | `ntlm`, `basic`, or `oauth`.                                     |
| `EXACT_API_DOMAIN`            | —        | Required by NTLM.                                                |
| `EXACT_API_DB_SERVER`         | —        | Required by NTLM and sent as `ServerName`.                       |
| `EXACT_API_DB_NAME`           | —        | Required by NTLM and sent as `DatabaseName`.                     |
| `EXACT_API_USERNAME`          | —        | Required by NTLM and Basic.                                      |
| `EXACT_API_PASSWORD`          | —        | Required by NTLM and Basic.                                      |
| `EXACT_API_ACCESS_TOKEN`      | —        | Required by OAuth.                                               |
| `EXACT_API_ACCESS_TOKEN_TYPE` | `Bearer` | OAuth authorization scheme.                                      |

The URL must be absolute HTTP(S), must not contain user information, and should end at the service root whose `$metadata` describes the desired API.

## Policy

| Variable                     | Default        | Meaning                                                                 |
| ---------------------------- | -------------- | ----------------------------------------------------------------------- |
| `EXACT_READ_ONLY`            | `true`         | Master write deny switch.                                               |
| `EXACT_ALLOWED_ENTITIES`     | all discovered | Comma-separated read allowlist; required for mutable entity operations. |
| `EXACT_ALLOWED_ACTIONS`      | none           | Comma-separated public action allowlist.                                |
| `EXACT_ALLOW_CREATE`         | `false`        | Register/allow create only when read-only is false.                     |
| `EXACT_ALLOW_UPDATE`         | `false`        | Register/allow update only when read-only is false.                     |
| `EXACT_ALLOW_DELETE`         | `false`        | Register/allow delete only when read-only is false.                     |
| `EXACT_ALLOW_EXECUTE_ACTION` | `false`        | Register/allow action and Flow tools only when read-only is false.      |

The process refuses contradictory configuration such as a write flag with `EXACT_READ_ONLY=true`.

## Operational limits

| Variable                       | Default |                                       Maximum |
| ------------------------------ | ------: | --------------------------------------------: |
| `EXACT_REQUEST_TIMEOUT_MS`     |   30000 |                                        300000 |
| `EXACT_MAX_PAGE_SIZE`          |     100 |                                          1000 |
| `EXACT_MAX_RESPONSE_BYTES`     | 5000000 |                                      50000000 |
| `EXACT_MAX_CONTINUATION_PAGES` |      10 |                                           100 |
| `EXACT_LOG_LEVEL`              |  `info` |    `debug`, `info`, `warn`, `error`, `silent` |
| `EXACT_METADATA_CACHE_PATH`    |   unset | Absolute path recommended; cache is optional. |

The current read tool returns one page plus a continuation cursor, so it does not automatically traverse pages. The continuation-page setting is reserved for bounded internal workflows.
