---
tag: review-process
author: jay-flowers
category: gotcha
created_at: 2026-10-25T21:30:46Z
identity: review-process-20261025T213046-jay-flowers
tier: draft
---

When a review-round fix commit changes behavior, prose written earlier in the same change goes stale — code, tests, and comments get updated with the fix, but release documentation authored before it does not. In opencode-supervisor opsx/engineer-directives round 2, fix commit d503bf8 replaced extension-allowlist path extraction with broader extractPolicyPaths and added 13 regression tests (40→53 new tests), yet two pre-fix artifacts survived verbatim: README §9's new limitation bullet still claimed forbidPath used "the same best-effort path extraction (and extension set) as the verified-trace check" (directly contradicted by the fix's own regression test), and the CHANGELOG still counted "40 new tests (137 total)" against an actual 53/150. Both were added BY the change being fixed, which is why no cross-repo sweep caught them. Fix pattern: after landing a review-round fix, treat the fix commit as a mini-change with its own doc sweep — grep the change's docs for the behavior the fix altered (limitation sections, config semantics) and re-verify every count the fix shifted (test totals, file counts) before re-dispatching the council. Complements documentation-20261025T200119, which covers enumeration sweeps at authoring time; this covers behavior-description staleness introduced by fix rounds.
