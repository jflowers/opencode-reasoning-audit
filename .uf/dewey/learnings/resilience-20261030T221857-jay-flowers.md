---
tag: resilience
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:18:57Z
identity: resilience-20261030T221857-jay-flowers
tier: draft
---

Nullish coalescing (`??`) treats an empty string as a winning value, which silently breaks "prefer X, fall back to Y" chains when X can be present-but-empty. In opencode-supervisor's derived-tier model lookup, `small_model ?? model` let a host config with `"small_model": ""` suppress the `model` fallback; the subsequent trim-emptiness check then discarded the value and the lookup was memoized as authoritatively resolved, permanently disabling the LLM audit tier despite an available `model`. Fix pattern: validate each candidate before it can win the chain (treat empty/whitespace strings as unset at selection time), and never mark a fallback chain "resolved" when the winning value failed validation.
