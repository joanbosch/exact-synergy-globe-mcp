# Exact compatibility

Compatibility is determined by the target installation's version, product update/service pack, enabled services, modules, license, and technical-account permissions. Dynamic `$metadata` is the source of truth.

| Product                  | Version                   | Authentication        | Metadata              | Reads           | Writes/actions  | Status  |
| ------------------------ | ------------------------- | --------------------- | --------------------- | --------------- | --------------- | ------- |
| Exact Synergy Enterprise | Pending test installation | NTLM expected         | Unit-fixture verified | Not live-tested | Not live-tested | Pending |
| Exact Globe+             | Pending test installation | Installation-specific | Unit-fixture verified | Not live-tested | Not live-tested | Pending |

For each live certification, record the Exact version/update, API root shape (without private hostnames), authentication mode, representative entity reads, pagination behavior, and separately approved mutable cases. Never copy a large Exact catalog into this repository.
