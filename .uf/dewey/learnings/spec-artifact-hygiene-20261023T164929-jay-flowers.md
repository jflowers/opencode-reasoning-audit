---
tag: spec-artifact-hygiene
author: jay-flowers
category: pattern
created_at: 2026-10-23T16:49:29Z
identity: spec-artifact-hygiene-20261023T164929-jay-flowers
tier: draft
---

When a spike disproves an assumed command or API, reconcile every artifact authored before the spike: grep the change's own documents (migration plans, task text, README) for the disproven reference. In opsx/audit-supervisor, spike 1.4 empirically proved `bunx oh-my-opencode install --local .` does not exist, yet the design.md Migration Plan and tasks.md task 4.3 still instructed it — the change's deploy record contradicted its own evidence chain. Spikes that disprove assumptions create a reconciliation obligation over every earlier artifact that relied on the assumption.
