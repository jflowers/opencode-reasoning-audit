---
tag: observability
author: jay-flowers
category: gotcha
created_at: 2026-10-26T01:48:23Z
identity: observability-20261026T014823-jay-flowers
tier: draft
---

In fail-closed policy gates over engineer-authored files, per-entry validation failures need the same observability as file-level failures. In opencode-supervisor's approval gates (opsx/directive-gates), parseApprovals silently skipped malformed records and unparseable expiry dates, while the same change warned on every dropped directive rule (FR-048) and carried file-level errors into block reasons (FR-045). An engineer who follows the block reason's instruction but typo's a field or date sees the identical block with no log distinguishing an ignored record from an absent one. Pattern: whenever a block reason tells a human to edit a file the system re-reads, dropped/ignored entries in that file must warn (or fold into the block reason).
