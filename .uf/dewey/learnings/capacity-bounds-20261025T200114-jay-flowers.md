---
tag: capacity-bounds
author: jay-flowers
category: gotcha
created_at: 2026-10-25T20:01:14Z
identity: capacity-bounds-20261025T200114-jay-flowers
tier: draft
---

When a bounded store gains an agent-facing confirmation message, handle the capacity boundary at the message layer too. A pure module that deliberately stores nothing at cap 0 (addReminder returns [] for cap <= 0) paired with an unconditional 'Reminder r1 stored... it reappears in the memo each turn' tool result produces a false durability promise — nothing is stored and nothing renders. Short-circuit the tool result (or report non-storage) whenever the resolved cap disables storage, so the result contract matches the module semantics.
