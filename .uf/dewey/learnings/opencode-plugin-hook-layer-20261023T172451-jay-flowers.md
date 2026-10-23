---
tag: opencode-plugin-hook-layer
author: jay-flowers
category: gotcha
created_at: 2026-10-23T17:24:51Z
identity: opencode-plugin-hook-layer-20261023T172451-jay-flowers
tier: draft
---

A plugin that creates auxiliary sessions through the same client and directory it supervises inherits its own hook traffic: per opencode 1.19.x, the plugin host dispatches every bus event in the plugin's directory to its hooks, and side sessions created with the same `query: { directory }` share that directory. In opencode-reasoning-audit (opsx/audit-supervisor), the auditor side sessions' reasoning parts therefore re-entered the `event` hook — the plugin audited its own auditor, recursively spawning side sessions with any reasoning-emitting auditor model (the README's own o3-mini example), accumulating one state Map entry per audit, and delivering spurious critiques/aborts into side sessions. The gap was invisible to unit tests (client fully mocked) and to the live smoke test (auditor LLM leg exercised only through fail-open). Fix pattern: record every plugin-created session ID at creation time (the ID is known where the session is created) and short-circuit all hooks for those IDs.
