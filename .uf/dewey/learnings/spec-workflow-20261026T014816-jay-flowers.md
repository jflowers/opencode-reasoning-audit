---
tag: spec-workflow
author: jay-flowers
category: gotcha
created_at: 2026-10-26T01:48:16Z
identity: spec-workflow-20261026T014816-jay-flowers
tier: draft
---

When a review round amends implemented behavior (e.g. single-match to all-matching return contracts, log-format fields), back-propagate the amendment to the committed design.md and tasks.md text in the same fix commit. Updating only README/CHANGELOG leaves the openspec change record contradicting the code it describes, and the stale text rides into openspec/specs/ at archive time where future changes cite it as the source of truth.
