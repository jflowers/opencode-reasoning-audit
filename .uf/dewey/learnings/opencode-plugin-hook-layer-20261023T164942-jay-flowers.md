---
tag: opencode-plugin-hook-layer
author: jay-flowers
category: gotcha
created_at: 2026-10-23T16:49:42Z
identity: opencode-plugin-hook-layer-20261023T164942-jay-flowers
tier: draft
---

A plugin can satisfy its hook contract end-to-end (append to output.system, verified against runtime source and AI SDK request capture) and still fail feature delivery when the model gateway ignores secondary system messages. In opencode-reasoning-audit's smoke test, both available providers (enmaas, OpenRouter) dropped pushed system content — proven with an independent control plugin occupying the same slot — while request-body capture showed the content leaving OpenCode correctly. Verify user-facing delivery at the model (needle tests), not at the API boundary, and surface environment-blocked features in user-facing Current Limitations, not only in spec artifacts.
