---
tag: tool-guard-content-keys
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:20:04Z
identity: tool-guard-content-keys-20261030T222004-jay-flowers
tier: draft
---

Path-lens tool guards that exempt write/edit content via a key-name blocklist (content/oldString/newString) only exempt those exact keys: extractPolicyPaths-style scanners read every other top-level string argument, so MCP/custom edit tools passing prose under other keys (text, patch, diff, body) get blocked when their content merely mentions a protected path. Document the blocklist explicitly rather than claiming "write content is never scanned," and state the fail-closed unknown-key residual in the operator docs.
