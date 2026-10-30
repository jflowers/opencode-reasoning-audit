---
tag: opencode-supervisor
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:17:29Z
identity: opencode-supervisor-20261030T221729-jay-flowers
tier: draft
---

The global supervisor config file (~/.config/opencode/supervisor/config.json) is protected by the tool guard only through an implicit cross-module coupling: normalizePathToken folds leading dots (.config → config), so the global path contains the guarded segment run 'opencode/supervisor/config.json' matched by checkProtectedState in src/tool-guard.ts. Changing the global path layout in index.ts (globalSupervisorConfigPath) or the dot-folding rule in normalizePathToken silently un-protects the global tier. Rerun the protected-state tests in test/gates.test.ts after touching either.
