---
tag: memo-design
author: jay-flowers
category: pattern
created_at: 2026-10-25T20:01:21Z
identity: memo-design-20261025T200121-jay-flowers
tier: draft
---

When an agent-writable channel rides a per-turn prompt injection (system-prompt memo, RAG preamble, tool-result echo re-rendered each turn), bound the aggregate rendered payload, not just per-item dimensions. Count caps and per-item length caps multiply: a 10-item cap x 2000-char per-item cap yields ~20KB (~5K tokens) re-sent on every model call for the session's remainder, and the writing agent — often the exact agent the middleware is supervising — controls the content. The cheap fix preserves full text in state while truncating or budgeting the render: render most-recent-first within a total character budget, or shorten per-item render length, since any one-time echo channel already delivered the full text. Symptom to watch for in design docs: reasoning like "count is already capped" on a size-sensitive prompt surface — that argues about one dimension of a product.
