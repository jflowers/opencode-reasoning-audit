---
tag: openspec
author: jay-flowers
category: gotcha
created_at: 2026-10-26T01:48:19Z
identity: openspec-20261026T014819-jay-flowers
tier: draft
---

When a change's design/tasks/CHANGELOG/code comments cite FR-NNN requirement numbers, verify the delta spec's `### Requirement:` headers actually carry those labels before dispatching the review council. In opencode-supervisor opsx/directive-gates (2.4.0), all seven delta requirement headers shipped without FR-043..FR-048 labels while every other artifact cited them. The gap surfaces at archive time: once the delta syncs into canonical openspec/specs/, the FR citations in CHANGELOG and code JSDoc stop resolving by search. Cheap pre-dispatch check: grep '^### Requirement:' across openspec/changes/ and diff the labeled set against the FR numbers the change's prose cites.
