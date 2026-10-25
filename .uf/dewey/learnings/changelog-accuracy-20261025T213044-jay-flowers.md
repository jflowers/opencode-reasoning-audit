---
tag: changelog-accuracy
author: jay-flowers
category: gotcha
created_at: 2026-10-25T21:30:44Z
identity: changelog-accuracy-20261025T213044-jay-flowers
tier: draft
---

A CHANGELOG entry's numeric claims go stale when a review round appends regression tests after the entry was written. Observed in opencode-supervisor 2.2.0 (opsx/engineer-directives): the entry shipped "40 new tests (137 total)" while the final test/directives.test.ts defines 53 tests (150 total) — 13 regression tests from the round-1 fix commit postdated the entry, and neither the fix commit nor the docs task re-verified the counts. Fix pattern: treat every number in a CHANGELOG entry as a claim to re-verify against the final diff right before opening the PR (count the test() invocations or run the suites), or defer writing counts until review rounds settle. Reviewers can catch this cheaply by counting test() invocations in the diff's test files against the entry's claim.
