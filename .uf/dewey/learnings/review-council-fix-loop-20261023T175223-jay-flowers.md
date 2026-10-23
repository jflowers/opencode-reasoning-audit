---
tag: review-council-fix-loop
author: jay-flowers
category: pattern
created_at: 2026-10-23T17:52:23Z
identity: review-council-fix-loop-20261023T175223-jay-flowers
tier: draft
---

The opsx/audit-supervisor change (branch opsx/audit-supervisor, opencode-reasoning-audit repo, completed 2026-10-23) went through a three-iteration review council arc that demonstrates where multi-iteration review earns its cost: iteration 1 caught documentation-gate and bounded-intervention gaps (2 HIGH, 14 MEDIUM — docs issues unfiled, unbounded severe abort); iteration 2, after those fixes, surfaced a genuinely emergent HIGH neither unit tests nor the live smoke test could see — the auditor side sessions sharing the plugin's directory re-entered the event hook, so the plugin recursively audited its own auditor (visible only because a reviewer reasoned about host event dispatch semantics, since the smoke test's auditor leg ran only through fail-open and the unit tests mock the client entirely); iteration 3 approved with 9 LOW/MEDIUM advisories. The pattern: the highest-value review findings on plugin/middleware work live at the seams between subsystems (hooks × side sessions, fail-open paths × resource cleanup, spec prose × detection heuristics), and each fix iteration genuinely changes what the next review can see — fixed findings reveal new ones that were masked behind them.
