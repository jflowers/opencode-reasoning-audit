---
tag: trusted-config
author: jay-flowers
category: gotcha
created_at: 2026-10-25T21:30:42Z
identity: trusted-config-20261025T213042-jay-flowers
tier: draft
---

When a supervision plane loads policy from the supervised project's own directory and renders it to the model or auditor as engineer-trusted text (memo sections, audit criteria prompts), the channel is plantable by the supervised agent itself: file-write tools plus a plugin restart turn agent-authored text into trusted policy, and broad enforce globs can brick tool usage for later sessions. No hot reload limits the blast to future sessions — which is also what makes it silent. Observed in opencode-supervisor 2.2.0 (opsx/engineer-directives): directive files under `.opencode/supervisor/directives/` load from `input.directory` with only a count in the identity log, so planted policy is indistinguishable from engineered policy at runtime. The issue stays low severity where the platform's trust model already grants the project directory equivalent power (e.g., opencode.json plugin registration), so the incremental risk is stealth and mislabeled trust, not new privilege. Cheap hardening that preserves the feature: log loaded directive ids (not just a count) at the identity line, and document the project-directory trust assumption in the limitations section. General rule: any channel injected into prompts under a "trusted" label needs a provenance story that accounts for the supervised party's write access, not just the repo author's.
