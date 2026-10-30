---
tag: api-design
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:18:53Z
identity: api-design-20261030T221853-jay-flowers
tier: draft
---

Reordering an exported TypeScript function's positional parameters behind a new all-optional first parameter breaks old callers silently: the legacy argument shape can be structurally assignable to the new parameter type, so the call compiles and the old value is ignored at runtime. In opencode-supervisor 2.5.0, resolveHookConfig(session) callers kept type-checking under the new (sources, session) signature while their session overrides were silently dropped. When changing exported signatures, prefer an additive trailing parameter, a runtime shape check that warns on the legacy form, or a MAJOR version bump — a migration note in the changelog does not protect semver-range consumers.
