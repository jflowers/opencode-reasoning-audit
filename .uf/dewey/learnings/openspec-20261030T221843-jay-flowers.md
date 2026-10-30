---
tag: openspec
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:18:43Z
identity: openspec-20261030T221843-jay-flowers
tier: draft
---

FR-NNN requirement IDs are globally unique across a repo's whole spec history, so numbering a new change's requirements requires scanning the highest allocated FR everywhere — CHANGELOG released entries AND active, unarchived changes under openspec/changes/, not just the archive. The directive-gates change (FR-043..FR-048) was still sitting unarchived in openspec/changes/ when fix-supervisor-logging numbered itself FR-043..FR-051, double-booking six IDs that index.ts comments and the CHANGELOG then cited with two different meanings (FR-044 = approvals protection vs fire-and-forget delivery; FR-045 = fail-closed gate verification vs log dedupe).
