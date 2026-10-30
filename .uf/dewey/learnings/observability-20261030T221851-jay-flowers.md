---
tag: observability
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:18:51Z
identity: observability-20261030T221851-jay-flowers
tier: draft
---

When a plugin routes diagnostics to its host's HTTP log endpoint, every warning emitted during plugin bootstrap — including those raised by file loaders invoked inside server() — must be queued and flushed at first hook. Fire-and-forget delivery silently drops anything sent before the host's HTTP listener binds, and because loaders run once per start, the dropped line is never re-emitted. In opencode-supervisor's fix-supervisor-logging change, the deferred bootstrapWarnings queue covered parse/compile/gate/config-file warnings, but loadDirectiveFiles' unreadable-directory and unreadable-file warnings went through the live logger at bootstrap time and were lost in exactly the window the queue was built to close. Audit every logger call site reachable from server() against the queue, not just the ones that return warning arrays.
