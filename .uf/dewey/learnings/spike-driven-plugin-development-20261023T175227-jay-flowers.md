---
tag: spike-driven-plugin-development
author: jay-flowers
category: pattern
created_at: 2026-10-23T17:52:27Z
identity: spike-driven-plugin-development-20261023T175227-jay-flowers
tier: draft
---

In the opsx/audit-supervisor rebuild (opencode-reasoning-audit, 2026-10-23), spike-driven verification against the installed OpenCode 1.19.0 binary's embedded source resolved every public-API unknown before implementation: the four Phase 1 spikes (event shape: message.part.updated with part.time.end completion semantics and sessionID:messageID:partID dedupe; steer delivery: V1 promptAsync + abort, no delivery option; tool blocking: throw inside tool.execute.before propagates verbatim; entry export: default-export PluginModule with mandatory id for file-source plugins, plus the discovery that bunx oh-my-opencode install --local never existed) were recorded as D6 subsections in design.md and became the authoritative reference for all Phase 3 hook wiring and both review fix loops — reviewers cited them, fixes amended them with bracketed notes, and the spec deltas stayed consistent with them. The pattern: when building against a fast-moving host runtime whose typings lag its behavior, spend a phase reading the shipped binary/source and write the findings into the design artifact as dated, amendment-friendly records — every later disagreement (review finding or doc drift) then resolves against recorded evidence instead of re-litigating from memory.
