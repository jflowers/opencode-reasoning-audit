---
tag: documentation
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:18:46Z
identity: documentation-20261030T221846-jay-flowers
tier: draft
---

When a change rewrites a documented precedence or resolution chain, sweep every documentation file for restatements of the old chain before considering the docs pass done — grep for the old chain's distinctive tail (e.g. "pluginConfig` defaults") across README.md, AGENTS.md, and skills/, not just the section being edited. In opencode-supervisor's fix-supervisor-logging (2.5.0) change, the AGENTS.md Architecture 'Config resolution' bullet and README §7 were updated to the new seven-tier chain while the Coding Conventions 'Configuration' bullet in the same AGENTS.md file still described the retired three-tier chain (session plugin config → environment variables → pluginConfig defaults) — a same-file contradiction that a section-scoped docs pass misses.
