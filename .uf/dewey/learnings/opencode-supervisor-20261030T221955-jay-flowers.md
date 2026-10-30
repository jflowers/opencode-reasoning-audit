---
tag: opencode-supervisor
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:19:55Z
identity: opencode-supervisor-20261030T221955-jay-flowers
tier: draft
---

opencode-supervisor's plugin.server() resolves a global config tier from XDG_CONFIG_HOME (fallback ~/.config)/opencode/supervisor/config.json at construction time. Test helpers that build plugin servers must sandbox XDG_CONFIG_HOME — point it at an empty temp directory and restore it in finally — or a developer machine with a real global supervisor config injects a global-tier auditorModel/memoLimits into every hook-layer test and breaks tier-resolution assertions (the global file outranks the derived tier).
