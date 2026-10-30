---
tag: performance
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:19:11Z
identity: performance-20261030T221911-jay-flowers
tier: draft
---

A trailing `.slice(0, N)` in a method chain does not bound the cost of the transforms before it. In opencode-supervisor's tool guard, `JSON.stringify(args).toLowerCase().slice(0, 65536)` fully serializes and lowercases an unbounded bash command before the cap applies — the 64 KiB bound limits only the match scope, not the transient allocations (roughly 3x the payload) made on every call inside the host process. Apply the slice first: `JSON.stringify(args).slice(0, N).toLowerCase()`.
