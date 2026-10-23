---
tag: uf-unleash-delegation
author: jay-flowers
category: gotcha
created_at: 2026-10-23T17:52:16Z
identity: uf-unleash-delegation-20261023T175216-jay-flowers
tier: draft
---

During the opsx/audit-supervisor implementation (2026-10-22/23), uf_delegate_command failed deterministically all session with HOST_MODEL_UNAVAILABLE ("current assistant active variant is unavailable or invalid", retryable: true but never recovered). The reliable fallback: delegate via the Task tool with subagent_type "cobalt-crush-dev" and fully self-contained prompts (repo path, branch, verbatim task text, design context, deliverable spec, allowed/forbidden file lists, explicit return format), then verify the child's self-report independently (run bun test + node --test, check git status/diff for the expected file set), then manually checkpoint {command: "uf.unleash", step, data: {phase, task, delegate: "task-tool-fallback"}} and mark_task_complete. Two additional gotchas from the same session: a delegate can return an EMPTY result with zero file changes (task 3.1 first attempt) — always detect via git status and retry the identical prompt once; and a delegate stored a dewey learning mid-implement (opencode-plugin-hook-layer-20261023T131952 appeared without orchestrator action) — enumerate .uf/dewey/learnings/ at summary time rather than trusting only orchestrator-stored identities.
