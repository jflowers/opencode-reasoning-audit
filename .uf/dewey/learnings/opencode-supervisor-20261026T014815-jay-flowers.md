---
tag: opencode-supervisor
author: jay-flowers
category: pattern
created_at: 2026-10-26T01:48:15Z
identity: opencode-supervisor-20261026T014815-jay-flowers
tier: draft
---

When a review-round fix corrects a copy-pasted expression, grep for sibling copies of the same expression before landing the fix. In opencode-supervisor directive-gates round 2, the trailing-slash basename fallback was corrected in two src/gates.ts copies while the same fix commit introduced a third spelling with different fallback semantics in index.ts — one change shipped two behaviors for the same edge case. Extracting a single shared helper (policyBasename) at fix time prevents the drift.
