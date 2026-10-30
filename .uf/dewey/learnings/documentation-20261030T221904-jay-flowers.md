---
tag: documentation
author: jay-flowers
category: pattern
created_at: 2026-10-30T22:19:04Z
identity: documentation-20261030T221904-jay-flowers
tier: draft
---

When a change widens a default behavior that multiple documentation sections inventory, updating only the feature's own section leaves the other sections stale. In opencode-supervisor 2.5.0, FR-061 extended the tool guard's agent-write protection from approvals.json to the config files, directives directory, and supervisor state directory, but only README §7 (Configuration) documented it; §6 (Engineer Console) still framed protection as approvals.json-only and §9 still carried defense-in-depth advice premised on the directory being unprotected. Check: grep the docs for the old scope's signature phrase (here "approvals.json") and update every section that states the inventory, not just the section introducing the change.
