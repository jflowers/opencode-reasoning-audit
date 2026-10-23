---
tag: openspec
author: jay-flowers
category: pattern
created_at: 2026-10-23T16:49:33Z
identity: openspec-20261023T164933-jay-flowers
tier: draft
---

When a spike invalidates an instruction recorded in earlier spec artifacts (a command, an API, a config field), propagate the correction back into every artifact that names it — task bodies, migration plans, README — not just the spike-results section. In opsx/audit-supervisor, spike 1.4 proved `bunx oh-my-opencode install --local .` does not exist, yet tasks.md 4.3 (marked complete) and design.md's Migration Plan still instruct that exact command, self-contradicting the same change's own evidence. Practical check: after each spike resolves, grep all spec artifacts for every string the spike invalidated and fix or annotate each hit before marking the spike task done.
