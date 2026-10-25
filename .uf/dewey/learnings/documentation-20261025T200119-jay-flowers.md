---
tag: documentation
author: jay-flowers
category: pattern
created_at: 2026-10-25T20:01:19Z
identity: documentation-20261025T200119-jay-flowers
tier: draft
---

When a change adds a new capability or state dimension to a project, sweep every enumeration the change implicitly extends — not just the feature's primary documentation surfaces. Three enumeration classes are routinely missed: (1) overview/roadmap status sentences that list the capability as future work (must flip to shipped), (2) state/content lists that enumerate what a store or layer tracks (must gain the new dimension), and (3) core-vs-optional differentiator sentences such as 'the middleware adds X, Y, Z which the alternative cannot do' (must gain the new differentiator). Observed in opencode-supervisor 2.1.0 (opsx/agent-reminders): the reminders change updated README thoroughly (lead, section 7.4, hook map, config table, state line) but left AGENTS.md's overview listing reminders under Roadmap, AGENTS.md's session-state bullet without reminders, and both files' middleware-vs-skill differentiator sentences without the agent console. Cause: the docs task scoped the AGENTS.md update to structure rows only. Fix pattern: when writing the docs task, enumerate every file+sentence that mentions the affected concept (grep the concept name across *.md) rather than listing only the sections that describe the new feature.
