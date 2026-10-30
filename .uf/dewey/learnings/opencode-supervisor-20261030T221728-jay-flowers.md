---
tag: opencode-supervisor
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:17:28Z
identity: opencode-supervisor-20261030T221728-jay-flowers
tier: draft
---

opencode-supervisor tests that exercise config-tier resolution (any test calling plugin.server() or resolveHookConfig() with the file tiers in play) must isolate XDG_CONFIG_HOME to a throwaway temp directory: save the old value, mkdtemp an isolation root, set it, and restore + rmSync in finally. Without isolation, a real ~/.config/opencode/supervisor/config.json on the host machine leaks into the global config tier and makes precedence tests machine-dependent. The six withClean*Env helpers implement this pattern; keep the isolation attached to any new hook-layer test file (or use the shared helper once extracted into test/mocks.ts).
