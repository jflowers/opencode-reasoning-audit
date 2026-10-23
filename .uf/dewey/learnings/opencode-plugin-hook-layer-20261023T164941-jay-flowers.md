---
tag: opencode-plugin-hook-layer
author: jay-flowers
category: gotcha
created_at: 2026-10-23T16:49:41Z
identity: opencode-plugin-hook-layer-20261023T164941-jay-flowers
tier: draft
---

When bounding an agent-intervention loop, bound every side-effecting channel independently. In opsx/audit-supervisor (opencode-reasoning-audit), maxRegenerations capped critique deliveries (promptAsync) but not severe interrupts (session.abort), and the abort deliberately fired before the bound check — so a session whose reasoning re-quoted a reward-hacking marker from history was aborted on every subsequent turn with no cap, no config kill-switch, and no corrective critique (deliveries already bound-spent). The live smoke test caught it only as an unplanned side finding. Any intervention channel that fires independently of the bounded channel needs its own budget, a quoted-history exemption, or a documented operator escape hatch.
