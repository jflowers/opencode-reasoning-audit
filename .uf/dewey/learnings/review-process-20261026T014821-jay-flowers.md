---
tag: review-process
author: jay-flowers
category: gotcha
created_at: 2026-10-26T01:48:21Z
identity: review-process-20261026T014821-jay-flowers
tier: draft
---

When a review-round fix hardens a matching or extraction idiom, grep the same fix commit for sibling copies of the idiom before landing it. In opencode-supervisor opsx/directive-gates round 1, the trailing-slash basename fallback was hardened in matchApproveGates and evaluateReviewGates (`|| argPath.toLowerCase()`) while the anti-self-approval check added by the same commit kept the unhardened `|| ''` fallback — three derivations of the same basename idiom on one hook path, two hardened, one not. Fixes that target an idiom rather than a single call site propagate unevenly because the fixer works from the finding's file, not the pattern's footprint. Reviewer's cheap check: search the whole diff for every occurrence of the fixed expression's shape (e.g. `split('/').pop()`) and confirm each copy received the hardening.
