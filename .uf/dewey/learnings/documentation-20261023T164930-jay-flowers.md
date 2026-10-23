---
tag: documentation
author: jay-flowers
category: pattern
created_at: 2026-10-23T16:49:30Z
identity: documentation-20261023T164930-jay-flowers
tier: draft
---

When a tasks.md orders the documentation task before the live verification task (opencode-reasoning-audit opsx/audit-supervisor: docs rewrite at 4.2, live smoke test at 4.3), the verification findings need a follow-up docs pass before merge — otherwise the README ships claiming benefits the change's own evidence contradicts. In this change, the smoke test recorded in design.md that the tested model gateways drop secondary system messages (memo content never reached the models) and that severe aborts loop unboundedly on markers re-quoted from history, but the README's supervisor-memo benefit claim and its Current Limitations section were finalized before those findings and never updated. Practical check: after any verification task completes, diff its recorded findings (design.md smoke-test sections, spike results) against the user-facing limitations and benefit claims, and update or scope them before the docs task is considered done.
