---
tag: config-resolution
author: jay-flowers
category: pattern
created_at: 2026-10-30T22:17:35Z
identity: config-resolution-20261030T221735-jay-flowers
tier: draft
---

When per-hook config resolution depends on a network lookup to the host's own API (e.g., an OpenCode plugin deriving its auditor model from client.config.get), memoize the in-flight promise, not just the success result. Success-only memoization (opencode-supervisor FR-058) still lets N concurrent hooks each start their own timeout race during the failure window — N parallel 5s-timeout requests blocking the tool-execution path — where a shared in-flight promise would collapse them to one bounded attempt. Pair the shared attempt with a timeout plus consecutive-failure backoff so a hanging endpoint degrades to at most one bounded stall per backoff window.
