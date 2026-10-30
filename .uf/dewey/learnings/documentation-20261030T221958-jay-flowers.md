---
tag: documentation
author: jay-flowers
category: pattern
created_at: 2026-10-30T22:19:58Z
identity: documentation-20261030T221958-jay-flowers
tier: draft
---

Dual-distribution release notes: when a behavior fix lands in every distribution of a project, the changelog entry written for the primary artifact silently misses the others. In opencode-supervisor 2.5.0, the no-hardcoded-model fix removed the slug from both index.ts (middleware) and skills/reasoning-auditor/skill.md (standalone skill, 1.0.0 → 1.1.0), but the CHANGELOG 2.5.0 entry covers only the middleware — the skill's frontmatter version is its only changelog, invisible to users who copied the file once and never re-copy (README §8 setup is literally "Copy one file"). Check: when a change touches a behavior that exists in multiple distribution artifacts, grep the release notes for each artifact's name and add a per-distribution line or a re-copy instruction.
