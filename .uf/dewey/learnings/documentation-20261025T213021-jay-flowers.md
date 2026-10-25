---
tag: documentation
author: jay-flowers
category: pattern
created_at: 2026-10-25T21:30:21Z
identity: documentation-20261025T213021-jay-flowers
tier: draft
---

A change that adds a test file updates the node --test file list in three places — package.json scripts, AGENTS.md build commands, and the README install/test section — and the README copy is the one that drifts: docs-gate enumeration sweeps cover feature enumerations (hook maps, module tables, session-state lists, roadmaps) but tend to skip copy-pasteable commands, even though commands are duplicated state. In opencode-supervisor's engineer-directives change, AGENTS.md and package.json gained test/directives.test.ts while README 7.1's Node command kept the three-file list. Practical check: when a diff touches any copy of a repeated command or file list, grep the repo for the other copies (e.g. the command's file arguments) as part of the stale-enumeration sweep.
