# Changelog

All notable changes to this project will be documented here following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and Semantic Versioning.

## [Unreleased]

## [0.1.1] - 2026-09-02

### Fixed

- Start the MCP server correctly when invoked through the symbolic-link executable created by npm and npx.

## [0.1.0] - 2026-09-02

### Added

- Standalone TypeScript MCP server using stdio.
- Safe environment configuration with offline discovery mode.
- Basic, OAuth token, and NTLM authentication adapters.
- Dynamic EDM `$metadata` catalog, resources, and optional local cache.
- Structured OData filters, validated entity reads, and safe continuation cursors.
- Policy-gated entity mutations, public actions, Synergy Flow scaffolding, verification, and audit events.
- Unit and MCP contract tests, generated catalog schema, documentation, and CI/release workflows.

[Unreleased]: https://github.com/joanbosch/exact-synergy-globe-mcp/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/joanbosch/exact-synergy-globe-mcp/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/joanbosch/exact-synergy-globe-mcp/releases/tag/v0.1.0
