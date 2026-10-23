---
tag: detection-rule-parity
author: jay-flowers
category: pattern
created_at: 2026-10-23T17:51:21Z
identity: detection-rule-parity-20261023T175121-jay-flowers
tier: draft
---

When two modules must enforce the same detection set (e.g., a reasoning-side invariant check and a tool-side guard over the same reward-hacking markers), mirror-with-comment coordination drifts silently — and drift covers matching semantics, not just marker membership. In opencode-reasoning-audit (opsx/audit-supervisor), src/auditor.ts checks a case-sensitive combined regex over raw reasoning text while src/tool-guard.ts lowercases serialized tool arguments before matching, so the "mirrored" sets already diverge in case behavior; a marker added to one module silently misses the other, and no test asserts parity. Fix pattern: extract a shared marker table into one pure module (or derive one module's matcher from the other's export), or at minimum add a parity test that feeds a single marker corpus through both checkers and asserts identical accept/reject outcomes — cross-referencing comments alone cannot keep two independently authored regexes equivalent.
