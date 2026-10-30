---
tag: spec-management
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:18:48Z
identity: spec-management-20261030T221848-jay-flowers
tier: draft
---

FR-NNN requirement numbers must be allocated by grepping the whole repository for de-facto claims — code comments, design docs, and CHANGELOG entries of prior unarchived changes — not just the formal spec-header sequence. In opencode-supervisor, the directive-gates change numbered its requirements FR-043..FR-048 only in code comments and design.md (its spec-delta headers were unnumbered), so a later change that continued from the last archived header (FR-042) silently double-assigned six IDs, leaving FR-043..FR-048 with two meanings each inside one source file. A number that exists only in a comment still collides when someone later registers it formally.
