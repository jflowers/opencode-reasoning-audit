---
tag: error-handling
author: jay-flowers
category: gotcha
created_at: 2026-10-25T21:30:28Z
identity: error-handling-20261025T213028-jay-flowers
tier: draft
---

JSON.parse succeeds on the literal `null` (and on primitives), so a try/catch around JSON.parse alone does not make config parsing fail-open: property access on the parsed null throws outside the guard and can crash the whole loader. When parsing fenced JSON config blocks (```supervisor fences, frontmatter, embedded rule blocks), validate `typeof parsed === 'object' && parsed !== null` before dereferencing, or wrap the dereferences in the same guarded region. Seen in opencode-supervisor src/directives.ts: a supervisor fence containing null crashed the entire plugin load despite the fail-open contract (FR-032).
