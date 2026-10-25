---
tag: path-matching
author: jay-flowers
category: gotcha
created_at: 2026-10-25T21:30:38Z
identity: path-matching-20261025T213038-jay-flowers
tier: draft
---

For a security control that matches policy globs against paths extracted from free-form tool arguments, extraction breadth is only half of coverage — anchoring semantics decide the rest. A start-anchored glob like `secrets/**` fails on `./secrets/x`, `~/secrets/x`, and `/abs/secrets/x` spellings that the extractor captures verbatim (leading `.`, `~`, and `/` all inside the candidate character class), while only dotfile globs (`.env*`) survive depth via a basename retry; `cd secrets && cat x` extracts no candidate at all. Observed in opencode-supervisor 2.2.0 (opsx/engineer-directives): the round-1 fix widened the extractor past the trace check's extension allowlist, but the README's canonical `secrets/**` example still silently misses absolute-path tool calls (the normal spelling for edit/read tools) and `./`-relative shell spellings. Fix pattern: normalize extracted candidates (strip leading `./`, test suffix-relative forms), document that un-prefixed globs are root-anchored and `**/`-prefixed globs are required for depth/absolute coverage, and add regression tests for each spelling class. A heuristic matcher's anchoring semantics are a requirement-scope decision, not an implementation detail — the same class of gap as spec-accuracy-20261023T175129 (heuristic boundary vs. spec-level claim), recurring one layer up.
