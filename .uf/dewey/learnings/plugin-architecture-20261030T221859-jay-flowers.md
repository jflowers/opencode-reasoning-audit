---
tag: plugin-architecture
author: jay-flowers
category: pattern
created_at: 2026-10-30T22:18:59Z
identity: plugin-architecture-20261030T221859-jay-flowers
tier: draft
---

In hook-layer plugins like opencode-supervisor, pure policy-matching logic added to a hook (path normalizers, segment-run matchers, reason cascades) should land in the pure src/ module that owns that concern — src/tool-guard.ts for tool-blocking policy — not inline in index.ts, even when a smaller inline precedent exists (the approvals.json basename check). Inline pure helpers in the hook layer cannot be unit-tested directly; they are covered only through full server() construction plus hook-dispatch harnesses, and they create a second home for the abstraction the src/ module already owns. Detection signal: a diff whose only coverage for new pure functions consists entirely of plugin.server()/dispatchToolBefore harness tests, while sibling helpers (e.g. extractPolicyPaths in src/directives.ts) have direct unit tests.
