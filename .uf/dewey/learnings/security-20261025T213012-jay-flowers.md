---
tag: security
author: jay-flowers
category: pattern
created_at: 2026-10-25T21:30:12Z
identity: security-20261025T213012-jay-flowers
tier: draft
---

Reusing a best-effort detection heuristic as the input funnel for a blocking control inherits the heuristic's blind spots. opencode-supervisor's FR-028 directive enforcement takes argument paths from extractArgPaths, whose eight-extension allowlist (ts/tsx/js/json/py/md/sql/sh) cannot see .env, .pem, .key, or extensionless files — so the advertised no-secrets use case and the spec's own .env.local scenario silently pass unchecked (tests masked the gap by using .ts paths). Enforcement matchers need their own input-coverage analysis: for each blocking rule, enumerate the inputs it must catch and verify the extractor actually surfaces them, instead of borrowing an extractor tuned for an advisory purpose.
