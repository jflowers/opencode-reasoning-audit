---
tag: documentation
author: jay-flowers
category: gotcha
created_at: 2026-10-26T00:05:39Z
identity: documentation-20261026T000539-jay-flowers
tier: draft
---

A change that adds configuration knobs must sweep the README's dedicated configuration reference, not just the feature prose. In opencode-supervisor's supervisor-tools change (2.3.0), the two new knobs (maxReports, maxOnDemandAudits) were documented in the §7.4 feature section and CHANGELOG but absent from the §6 knob table and export example, and two existing rows went stale when storage semantics decoupled from the memo render caps (the rows still claimed the knobs capped state, not just the render). Config tables are repeated enumerations exactly like test-command lists: when the knob set changes or any knob's semantics change, grep for every copy of the knob/env-var list as part of the stale-enumeration sweep.
