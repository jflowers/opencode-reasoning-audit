---
tag: documentation
author: jay-flowers
category: gotcha
created_at: 2026-10-25T18:59:39Z
identity: documentation-20261025T185939-jay-flowers
tier: draft
---

A docs-issue task that cites only the in-repo AGENTS.md gate leaves the org constitution's unbound-force/website cross-repo gate unexecuted, and the miss recurs: in jflowers/opencode-supervisor, opsx/audit-supervisor satisfied both gates only because review caught it (in-repo #2 + unbound-force/website#321), while opsx/rebrand-supervisor's task 4.2 again named only the in-repo target — the breaking 2.0.0 rename reached review with no website-repo issue at all. Fix pattern: every docs-issue task must enumerate BOTH gate targets by repository name at authoring time, and reviewers accepting a docs-gate checkbox should search the website repo's open issues for the change name before treating the gate as satisfied.
