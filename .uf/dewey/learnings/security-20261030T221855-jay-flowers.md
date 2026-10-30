---
tag: security
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:18:55Z
identity: security-20261030T221855-jay-flowers
tier: draft
---

When narrowing a guard's argument-scanning lens to kill false positives, audit what the OLD lens covered before shipping the narrowing. In opencode-supervisor's FR-061 round-3 change, restricting non-bash tools to four operational argument keys (filePath/path/directory/pattern, so write/edit content is treated as data) fixed content-mention false positives — but the 2.4.0 approvals.json anti-tamper had been fed by a key-agnostic scan (extractPolicyPaths over all top-level string values), so the narrowing also silently removed approvals protection for custom/MCP tools with non-standard key names, while README section 6 still claimed unqualified basename-based blocking. Fix pattern: prefer a content/prose-key denylist (content, oldString, newString, prompt, diff) over an operational-key allowlist so unknown tools keep coverage, re-run the old check's bypass corpus against the new lens, and update any doc that states the old coverage in the same change.
