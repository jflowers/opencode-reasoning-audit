---
tag: openspec-workflow
author: jay-flowers
category: gotcha
created_at: 2026-10-26T00:05:36Z
identity: openspec-workflow-20261026T000536-jay-flowers
tier: draft
---

In this repo's OpenSpec convention, a change that adds a requirement against another capability's surface must declare that capability under Modified Capabilities even though openspec/specs/ holds no main specs — agent-reminders and engineer-directives both declared supervisor-memo modified for their memo sections. supervisor-tools declared "Modified Capabilities: None" while adding FR-036 (a memo section), a required MemoLimits field, and a storage-retention change that rewrote two FR-017-era storage-bound tests, with the proposal also claiming "observable behavior is unchanged" and "existing suites unchanged." The per-change capability graph is how future changes and reviewers discover prior requirements; reconcile the proposal's Capabilities/Impact/Compatibility bullets against the final CHANGELOG "Changed" entries and the rewritten tests before marking the spec artifacts done.
