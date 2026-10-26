---
tag: documentation-completeness
author: jay-flowers
category: pattern
created_at: 2026-10-26T00:05:34Z
identity: documentation-completeness-20261026T000534-jay-flowers
tier: draft
---

When a change extends a configuration precedence chain, sweep every canonical enumeration of the knobs, not just the prose where the new knobs are introduced. In opencode-supervisor 2.3.0, OPENCODE_SUPERVISOR_MEMO_MAX_REPORTS and OPENCODE_SUPERVISOR_MAX_ON_DEMAND_AUDITS landed in README §7.4 prose but the configuration table and export-example block (the reference users configure from) kept the old row count; the completed docs-sweep task had verified only the test-command enumerations. Docs-sweep verify clauses should name each enumeration surface explicitly (config table, export block, AGENTS.md commands, package.json scripts, README test commands) so a sweep cannot pass while one surface is stale.
