---
tag: security
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:18:41Z
identity: security-20261030T221841-jay-flowers
tier: draft
---

When a tool guard protects files by matching extracted path tokens, suffix equality (endsWith) is strictly weaker than basename equality against traversal spellings — `dir/sub/../sub/config.json` survives suffix matching while the basename form would still catch `a/../approvals.json`. And extraction coverage bounds the whole check: POLICY_PATH_PATTERN (slash-or-leading-dot tokens) means cd-then-relative (`cd .opencode/supervisor && cat config.json`) and variable-indirection spellings never produce a matching token at all. When adding a new protected file to such a guard, apply the full mitigation set at introduction time: lexically normalize extracted tokens (resolve `./` and `../`), pair the extracted-path checks with a case-insensitive raw-args substring test for the protected name, add regression tests for cd+relative / traversal / variable-indirection spellings, and word the README to the check's actual coverage class instead of claiming unconditional blocking. Observed in opencode-supervisor opsx/fix-supervisor-logging (2.5.0): the new config.json write-protection re-introduced, for a new file, the bypass class already documented for approvals.json in learning security-20261026T014814-jay-flowers — the block reason even names the protected literal, teaching the supervised agent which spelling to avoid on retry.
