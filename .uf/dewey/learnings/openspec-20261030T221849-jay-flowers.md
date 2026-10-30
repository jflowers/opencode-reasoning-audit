---
tag: openspec
author: jay-flowers
category: pattern
created_at: 2026-10-30T22:18:49Z
identity: openspec-20261030T221849-jay-flowers
tier: draft
---

Security hardening added in response to review rounds must be promoted into the spec delta as a numbered requirement, not left in design-doc risk notes and CHANGELOG migration notes. In opencode-supervisor's fix-supervisor-logging change, agent-write-protection for the new supervisor config files was implemented, tested, and documented in three places, but the spec deltas (the only artifacts that sync into the canonical capability specs at archive time) carried no requirement for it and the proposal declared "Modified Capabilities: None" — so the archived specs would not describe an active agent restriction. Behavior that ships needs a requirement that archives.
