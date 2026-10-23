---
tag: opencode-plugin-hook-layer
author: jay-flowers
category: gotcha
created_at: 2026-10-23T17:25:05Z
identity: opencode-plugin-hook-layer-20261023T172505-jay-flowers
tier: draft
---

A bound enforced as check-then-await-then-reserve has an overshoot window. In opencode-reasoning-audit's critique delivery, maxRegenerations is checked before the awaited session.abort and the delivery slot is incremented only after it; because the event hook is fire-and-forget (audits for near-simultaneous reasoning parts run concurrently), two concurrent severe findings can both pass the check and both abort+deliver over a bound of 1. The inline comment claiming the slot is "reserved synchronously before any await" was true only for the minor path. Pattern: when a limit guards side-effecting awaits, make check-and-reserve one synchronous step before any await, and decide explicitly whether a side effect that already fired (the abort) consumes the slot when the follow-up delivery fails.
