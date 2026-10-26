---
tag: documentation
author: jay-flowers
category: gotcha
created_at: 2026-10-26T00:05:33Z
identity: documentation-20261026T000533-jay-flowers
tier: draft
---

A documentation sweep that fully updates the feature section for a new capability can still leave the canonical registers stale. In opencode-supervisor 2.3.0 (opsx/supervisor-tools), README §7.4 completely documented recall/report/request_audit and both new env vars, while the §6 configuration table (which the §6 intro declares to be the complete OPENCODE_SUPERVISOR_* register), the README intro/§1/§5.4 memo-content enumerations, and the AGENTS.md structure-tree memo.ts comment all omitted the new Agent-reports memo section and the two new knobs — and the checked docs-sweep task's 'no stale enumerations' criterion passed anyway. Practical sweep when a change adds (a) a new section to a composed artifact (memo, report, rendered payload) or (b) new configuration knobs: grep every enumeration of that artifact's contents and the config-register table for the old list, and treat the feature section as only one of the surfaces to update. Also extend the docs-verification issue's checklist to cover the config register — #20's checklist verified the §5.4 module-table addition but not the §6 table, so post-merge verification would have re-checked only the feature sections and missed the same gap.
