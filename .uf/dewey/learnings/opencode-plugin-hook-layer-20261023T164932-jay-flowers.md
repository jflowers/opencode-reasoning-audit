---
tag: opencode-plugin-hook-layer
author: jay-flowers
category: gotcha
created_at: 2026-10-23T16:49:32Z
identity: opencode-plugin-hook-layer-20261023T164932-jay-flowers
tier: draft
---

A configuration precedence tier is only real if a live call site can supply that tier's data. In the opencode-reasoning-audit rebuild (opsx/audit-supervisor), resolveHookConfig(session?) implements session plugin config → environment → defaults, but no registered hook receives a session object (the Hooks API hands hooks only a sessionID), so tier 1 exists only in unit tests and user settings placed there are silently ignored while the README documents it as the highest-precedence tier. When porting a config chain to a new host API, enumerate which call sites can actually reach each tier before documenting it; drop, re-wire, or explicitly caveat tiers that no live call site can feed.
