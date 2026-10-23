---
tag: opencode-plugin-hook-layer
author: jay-flowers
category: gotcha
created_at: 2026-10-23T17:24:59Z
identity: opencode-plugin-hook-layer-20261023T172459-jay-flowers
tier: draft
---

In fail-open designs, the failure path is the expected steady state, so cleanup-on-success-only resource management leaks at operation rate. In opencode-reasoning-audit's createInvokeModel (opsx/audit-supervisor), the auditor side session is deleted only after successful response-text extraction; a prompt transport rejection, an in-band message error, or an empty response throws past the delete — and in the designed degradation mode (unauthenticated auditor model, which the live smoke test itself ran in) every audited reasoning step takes that path, permanently accumulating one side session per audit in the session DB. Pattern: any resource allocated before a call that fail-open wrapping guards (side sessions, temp files, spawned processes) needs try/finally best-effort cleanup on the failure path too — fail-open converts exceptional paths into steady-state paths, which turns success-only cleanup into an unbounded leak.
