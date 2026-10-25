---
tag: documentation-gate
author: jay-flowers
category: gotcha
created_at: 2026-10-25T20:01:16Z
identity: documentation-gate-20261025T200116-jay-flowers
tier: draft
---

An unchecked docs-gate checkbox in tasks.md is not evidence the gate failed: in jflowers/opencode-supervisor opsx/agent-reminders (2.1.0), task 5.1 was unchecked at review time, but both required issues — in-repo #11 and unbound-force/website#327 — had been filed just before the council dispatch. Reviewers must search both tracker targets (the current repo and unbound-force/website) for the change name before flagging a gate miss; the residual defect is bookkeeping, and the durable fix is recording the filed issue numbers in the change's tasks.md (checkbox text or workflow follow-up) so the gate evidence survives archiving. Complements documentation-20261025T185939-jay-flowers, which found the inverse failure (a checked box naming only one target while the website gate went unexecuted): checkbox state is never evidence in either direction — always search the trackers.
