---
tag: efficiency
author: jay-flowers
category: pattern
created_at: 2026-10-25T21:30:31Z
identity: efficiency-20261025T213031-jay-flowers
tier: draft
---

Static policy rules (globs, regexes) evaluated on hot paths — per tool call, per request, per event — should be precompiled once at load time, together, not recompiled inside the matching function. In opencode-supervisor's engineer-directives change, enforce-rule globs were precompiled at server start (compileEnforcement) while trigger-rule globs recompiled inside matchTriggers on every tool.execute.before — up to 200 RegExp constructions per call for policy that never changes after load. When adding a second rule kind to an existing guard pipeline, extend the existing startup compilation step rather than compiling inline at match time.
