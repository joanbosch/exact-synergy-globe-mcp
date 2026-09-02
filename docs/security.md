# Security

Use a dedicated, least-privilege Exact account and an entity allowlist. Keep `EXACT_READ_ONLY=true` unless a reviewed use case requires a specific mutation. Enable only one write capability at a time and use narrow allowlists.

The server applies schema validation for configuration and MCP input, live-metadata validation, structured OData with escaped typed values, response limits, redirect denial, continuation URL containment, no retries, unknown-outcome mutation errors, read-back verification, and secret redaction. Logs use `stderr` exclusively.

Metadata cannot always prove whether a vendor operation is intended for public use. The parser conservatively excludes internal/private/system-looking names and annotations, and execution requires a second explicit allowlist. Operators must still review Exact's documentation and the target installation before enabling an action.

The NTLM adapter relies on `axios-ntlm`; Basic and OAuth use Axios directly. Keep dependencies patched through Dependabot and CI audit checks. TLS verification uses Node.js defaults and is never disabled by this package.

Report vulnerabilities privately to the repository owner. Do not include credentials, tokens, personal records, or production response bodies in reports.
