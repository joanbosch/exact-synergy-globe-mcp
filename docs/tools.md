# Tools

## Always registered

- `exact_get_server_info`: safe configured/connected status and catalog counts.
- `exact_get_capabilities`: detected and verified capability states.
- `exact_list_entities`: policy-filtered entity summaries.
- `exact_get_entity_schema`: one entity's keys and properties.
- `exact_get_entity`: one record by simple or composite key.
- `exact_list_entity_records`: structured filter, select, order, limit, skip, and continuation cursor.
- `exact_list_actions`: public discovered actions only.
- `exact_get_action_schema`: one public action's parameters and return type.

Supported structured filters are comparisons (`eq`, `ne`, `gt`, `ge`, `lt`, `le`), string operations (`contains`, `startsWith`, `endsWith`), boolean groups (`and`, `or`), and `not`. Field names and value types are validated against live metadata. There is intentionally no argument for raw `$filter`, `$select`, `$orderby`, paths, or URLs.

## Conditionally registered

- `exact_create_entity`
- `exact_update_entity`
- `exact_delete_entity`
- `exact_execute_action`
- `synergy_request_flow`
- `synergy_document_flow`
- `synergy_resource_flow`
- `synergy_account_flow`

These tools only appear when a connection is configured, the master read-only switch is off, and the corresponding operation is enabled. Entity mutations additionally require `EXACT_ALLOWED_ENTITIES`. Actions and Flow operations must be present as public operations in live metadata and named in `EXACT_ALLOWED_ACTIONS`.

POST operations are never retried. If the connection fails after dispatch, the result tells the caller to inspect Exact before considering any retry.
