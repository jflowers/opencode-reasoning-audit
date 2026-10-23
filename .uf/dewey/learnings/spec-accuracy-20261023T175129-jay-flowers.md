---
tag: spec-accuracy
author: jay-flowers
category: pattern
created_at: 2026-10-23T17:51:29Z
identity: spec-accuracy-20261023T175129-jay-flowers
tier: draft
---

An unconditional requirement ("every X SHALL be checked") implemented through heuristic detection (extension allowlists, keyword lists, pattern matchers) overstates enforcement unless the spec defines the detection scope. In opencode-reasoning-audit's tool-guard spec delta (opsx/audit-supervisor), FR-010 says "every file path in a tool call's arguments SHALL appear in [the verified trace] or the system SHALL block the call," but the implementation (FILE_PATH_PATTERN, carried unchanged from v0) recognizes only eight extensions (ts, tsx, js, json, py, md, sql, sh) — so in Go/YAML/Java projects the hallucinated-path guard silently no-ops while the spec and the README use-case promise blanket coverage. The gap evaded two review iterations because the acceptance scenarios used .ts paths, satisfying every scenario while the normative prose claimed more. Practical check: for each spec SHALL over a class of inputs, identify the implementation's detection heuristic and either encode its boundary in the requirement text ("file paths ending in recognized source extensions") or widen the heuristic deliberately — a heuristic's boundary is a requirement-scope decision, not an implementation detail.
