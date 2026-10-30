---
tag: tool-guard
author: jay-flowers
category: pattern
created_at: 2026-10-30T22:18:19Z
identity: tool-guard-20261030T221819-jay-flowers
tier: draft
---

When a tool guard pairs normalized path-token matching with a raw-arguments scan (to catch spellings the path extractor cannot tokenize, e.g. `cd .opencode/supervisor && cat config.json`), the raw scan must match compound path fragments ('opencode/supervisor'), not a conjunction of independent substring tokens ('supervisor' AND 'config.json'). Content-bearing tool arguments — the `content`/`newString` fields of write/edit tools — are part of the serialized args, so a loose token conjunction blocks agents that merely write documentation mentioning the protected names while never touching the protected files. The compound-fragment form preserves both evasion scenarios (traversal collapses in the token lens; the cd spelling contains the directory prefix verbatim) while shrinking the false-positive surface by an order of magnitude; any residual false positives (docs quoting the literal path) should be documented as accepted alongside the false-negative residuals.
