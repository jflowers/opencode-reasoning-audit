---
tag: changelog-accuracy
author: jay-flowers
category: gotcha
created_at: 2026-10-26T00:05:38Z
identity: changelog-accuracy-20261026T000538-jay-flowers
tier: draft
---

Verify CHANGELOG test-count arithmetic by counting ^test( declarations per file before flagging a mismatch. opencode-supervisor's 2.3.0 entry claims "32 new tests (182 total)," which looks wrong against 2.2.0's "137 total" (137 + 32 = 169), but the actual count is 182 (audit 67 + memo 8 + reminders 22 + directives 53 + console 32) — the pre-existing 2.2.0 entry had understated its own total (150 actual vs 137 claimed). A surprising number in a new entry is as likely an older entry's error as the new one's; count the files, then attribute the discrepancy to the right release.
