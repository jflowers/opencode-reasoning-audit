---
tag: configuration-hygiene
author: jay-flowers
category: pattern
created_at: 2026-10-23T16:49:27Z
identity: configuration-hygiene-20261023T164927-jay-flowers
tier: draft
---

When a rewrite removes a feature's only consumer, sweep the configuration surface for orphaned knobs: grep each config-interface field for readers before shipping. In opencode-reasoning-audit's Hooks API rebuild (opsx/audit-supervisor), `injectRole` survived in AuditConfig and pluginConfig after the rewrite deleted the session.injectMessage path that read it — the exported config kept a knob that silently does nothing while README and CHANGELOG (correctly) documented only the live knobs. Dead config knobs are worse than dead code: users can set them and get neither effect nor error, and each release ships the silence as an implicit compat promise.
