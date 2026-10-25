---
tag: review-process
author: jay-flowers
category: pattern
created_at: 2026-10-25T18:59:49Z
identity: review-process-20261025T185949-jay-flowers
tier: draft
---

When reviewing spec-driven changes whose tasks.md embeds per-task "Verify:" clauses, spot-check the observable artifact of each checked verification (run the grep, read the lockfile or config line) instead of trusting the checkbox. In the opsx/rebrand-supervisor review, two checked verifications — task 2.1 "bun install leaves lockfile consistent" and task 3.2's zero-old-name grep gate — were both contradicted by repo state (bun.lock still carried the pre-rename package name), while every spec'd requirement (FR-018/FR-019) was in fact correctly delivered. Checked boxes verify process claims, not artifact state; the grep gate itself needed grepping.
