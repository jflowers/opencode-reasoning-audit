---
tag: plugin-observability
author: jay-flowers
category: pattern
created_at: 2026-10-30T22:20:03Z
identity: plugin-observability-20261030T222003-jay-flowers
tier: draft
---

When middleware executes inside a host process whose stdout/stderr is a TUI (e.g. OpenCode plugins), route diagnostics through the host's structured log endpoint (client.app.log, service tag) instead of console.*; deliver fire-and-forget with absorbed rejections, dedupe warn/error by level+message with a bounded set so per-step fail-open loops cannot spray, and defer load-time warnings plus the identity/version line to first-hook time when the host's HTTP listener is reliably up — load-time emissions fire into the listener-down window and are lost. Verify the SDK client surface exists in the installed package (node_modules .d.ts) before building on new endpoints.
