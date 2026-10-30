---
tag: content-pipeline
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:18:17Z
identity: content-pipeline-20261030T221817-jay-flowers
tier: draft
---

Review rounds that widen user-facing scope after tracking issues are filed leave the earlier issues and release docs stale. In opencode-supervisor opsx/fix-supervisor-logging, round 1 filed docs issue #30 and blog issue #31 against commit 0daeb46 and wrote the 2.5.0 CHANGELOG migration notes; review round 2 then widened FR-061 protected-state blocking to the directives directory, and neither the migration notes, #30's impact list, nor #31's angles were re-synced (and #31's FR-range and README-section citations were wrong from the start). Practical check: when a later review round changes user-facing behavior, diff that round's behavioral scope against every tracking issue and release-doc entry filed by earlier rounds, and re-sync them in the same round — a docs gate verified against round-1 artifacts does not survive a round-2 scope change.
