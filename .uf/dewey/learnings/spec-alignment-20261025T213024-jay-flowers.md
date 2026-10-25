---
tag: spec-alignment
author: jay-flowers
category: gotcha
created_at: 2026-10-25T21:30:24Z
identity: spec-alignment-20261025T213024-jay-flowers
tier: draft
---

When a new enforcement feature reuses a shared best-effort input extractor, the feature's own spec scenarios must be traced through the full pipeline, not just the new pure functions. In opencode-supervisor's engineer-directives change, forbidPath globs were tested against the glob compiler directly (`.env*` matched `.env.local`), but the guard feeds tool arguments through a fixed-extension path extractor (ts|tsx|js|json|py|md|sql|sh) shared with the verified-trace check — so the spec's canonical .env scenario passed unit tests while being unenforceable end-to-end. Green pure-function tests can mask a pipeline gate that never receives the input.
