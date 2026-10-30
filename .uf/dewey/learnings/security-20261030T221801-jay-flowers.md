---
tag: security
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:18:01Z
identity: security-20261030T221801-jay-flowers
tier: draft
---

Supervisor middleware that reads security-relevant toggles (guard on/off switches, auditor model) from a project-local config file inherits the project directory's trust class — the supervised agent can write that file. opencode-supervisor already blocks agent writes to approvals.json for exactly this reason (anti-self-approval), yet its 2.5.0 config-file tiers (project .opencode/supervisor/config.json and the opencode.json options.config key) can set blockRewardHacking/requireStepReferenceInTools to false and a bogus auditorModel (which fails open), silently, taking effect on the next plugin start — a restart-surviving self-defang vector. Pattern: for any agent-supervision control plane, enumerate which config tiers are agent-writable; either restrict enforcement-disabling knobs to engineer-trusted tiers (environment variables, user-global config outside the project), or log every successfully applied knob at plugin start so a planted config is observable in the server log. A design-doc claim that config files "never bypass enforcement" must be checked against the actual knob list, not just the rule pipeline.
