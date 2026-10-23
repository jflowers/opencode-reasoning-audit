---
tag: opencode-plugin-hook-layer
author: jay-flowers
category: gotcha
created_at: 2026-10-23T16:49:44Z
identity: opencode-plugin-hook-layer-20261023T164944-jay-flowers
tier: draft
---

A documented configuration-precedence tier is a defect if no live code path can reach it. opencode-reasoning-audit's README and FR-004 document session plugin config → env → defaults, but every hook calls resolveHookConfig() with no session argument (hook inputs carry sessionID only), so only env and defaults are effective at runtime; the session tier existed solely in unit tests that call the resolver directly. When documenting precedence, trace each tier to the runtime call site that feeds it — a tier exercised only by tests is documentation debt, and per-session config needs a deliberate capture path (e.g., the chat.params hook) or honest removal from the docs.
