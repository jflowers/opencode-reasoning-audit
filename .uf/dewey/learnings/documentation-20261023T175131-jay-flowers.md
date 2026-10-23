---
tag: documentation
author: jay-flowers
category: pattern
created_at: 2026-10-23T17:51:31Z
identity: documentation-20261023T175131-jay-flowers
tier: draft
---

When a documentation fix adds a runtime-reachability caveat for one tier of a configuration precedence chain, sweep every orientation document that states the chain, not just the user-facing README. In opencode-reasoning-audit's review-finding-#6 fix (opsx/audit-supervisor), the "session-config tier is unreachable from hooks" caveat landed in README §6, the FR-004 spec amendment, and resolveHookConfig's JSDoc — but AGENTS.md's rewritten Architecture and Coding Conventions bullets still present session → env → defaults as the live chain, so a contributor orienting from AGENTS.md alone documents a dead tier. Practical check: when correcting a precedence claim, grep every orientation doc (README, AGENTS.md, CONTRIBUTING) for each tier name in the chain being corrected.
