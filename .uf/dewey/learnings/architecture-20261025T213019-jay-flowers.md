---
tag: architecture
author: jay-flowers
category: gotcha
created_at: 2026-10-25T21:30:19Z
identity: architecture-20261025T213019-jay-flowers
tier: draft
---

When wiring a new enforcement or policy plane into an existing pipeline, audit the reused input extractor's implicit assumptions before sharing it. In opencode-supervisor's engineer-directives change, forbidPath enforcement reused the verified-trace check's path extractor, whose extension whitelist (.ts/.js/.json/...) was an acceptable best-effort heuristic for trace matching but silently blinded enforcement for .env/.pem/.key and extensionless paths — the spec's own `.env*` acceptance scenario became unimplementable, and the shipped tests (using .ts paths) could not detect it. A heuristic input filter is safe to share only when every consumer tolerates the heuristic's gaps; an enforcement consumer needs the extractor's coverage to match its documented contract, or the gap must be surfaced at the seam (spec wording + load-time warning).
