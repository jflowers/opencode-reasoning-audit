---
tag: documentation
author: jay-flowers
category: gotcha
created_at: 2026-10-25T21:30:48Z
identity: documentation-20261025T213048-jay-flowers
tier: draft
---

A CHANGELOG entry's verification claims go stale when a review round amends the change after the entry is written. In opencode-supervisor 2.2.0 (opsx/engineer-directives), the entry said '40 new tests (137 total)' — internally consistent with the 97-test 2.1.0 baseline when authored — but resolving round-1 REQUEST CHANGES added 13 regression tests, shipping 53 new / 150 total with the entry never refreshed. Fix pattern: treat 'refresh factual claims in CHANGELOG/README' as a mandatory step of every review-fix loop (alongside the code fix), and verify published counts against the artifact (grep -c '^test(' per test file, or the runner's own summary) rather than the authored number — the same checked-box-versus-artifact discipline as the review-process learnings, applied to release notes.
