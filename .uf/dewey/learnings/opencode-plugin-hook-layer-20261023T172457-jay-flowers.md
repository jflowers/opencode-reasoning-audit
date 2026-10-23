---
tag: opencode-plugin-hook-layer
author: jay-flowers
category: gotcha
created_at: 2026-10-23T17:24:57Z
identity: opencode-plugin-hook-layer-20261023T172457-jay-flowers
tier: draft
---

When enforcing a per-session intervention bound with a check-then-increment counter, the increment must follow the check with no intervening await on ANY path — a comment claiming the slot is "reserved synchronously before any await" is only true for paths with no side-effecting await first. In opencode-reasoning-audit's createCritiqueDelivery, the severe path awaited session.abort between the maxRegenerations check and critiqueCount += 1, so concurrent severe findings could both pass the check, both abort, and both deliver, overshooting the bound; only the minor (await-free) path was race-safe. Fix pattern: reserve the slot immediately after the bound check, then perform side effects (interrupts, deliveries), releasing the slot only on the failure that should not count. Verify the invariant by test on every severity path, not just the simplest one.
