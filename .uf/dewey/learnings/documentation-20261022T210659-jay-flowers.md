---
tag: documentation
author: jay-flowers
category: pattern
created_at: 2026-10-22T21:06:59Z
identity: documentation-20261022T210659-jay-flowers
tier: draft
---

When scoping documentation impact in a spec, diff the project's orientation docs (AGENTS.md overview/architecture, README) against the behavior the change REMOVES, not just the files it adds. A docs task scoped to 'update the structure section for <new-file>' silently leaves overview and architecture prose describing deleted APIs. Practical check: grep the orientation docs for every API name the proposal removes and confirm each mention is covered by a docs task.
