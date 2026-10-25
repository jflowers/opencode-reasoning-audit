# Design

## Context

The session-state layer (index.ts `SessionState`) already holds the
goal, verified steps, solved items, critiques, reminders, and
triggered directives; the memo re-renders a recency-bounded view
every turn; `Hooks.tool` hosts the console's first slice
(`remind_me` / `forget_reminder`, change agent-reminders). Three
constraints shape this change: every list is append-bounded at the
same cap the memo renders (so nothing older than the memo view
survives in storage today); the audit pipeline
(`runPeerAudit` + the D2 `invokeModel` adapter + side-session
self-suppression via `auditorSessionIds`) is hook-wired in
`server()` and closable over; and `tool.execute` results are
in-conversation text, the delivery channel that survives gateway
memo drops (D7 of agent-reminders).

## Goals / Non-Goals

**Goals:**

- Three new console tools — `recall`, `report`, `request_audit` —
  on the existing state layer, following the agent-reminders
  pattern (pure `src/` module, meta-prompt descriptions, echo
  results, inert side sessions, fail-open bodies).
- Recall reaches deeper than the memo renders: storage retention
  for solved items and critiques decouples from render caps.
- On-demand audits reuse the audit pipeline unchanged; solicited
  critiques return in the tool result without steering.
- All new bounds ride the existing precedence chain.

**Non-Goals:**

- Any change to the automatic audit loop, critique delivery
  (steer/interrupt), or the regeneration budget.
- New engineer-directive rule kinds (roadmap item, separate
  change).
- Report analytics, search, or cross-session persistence.
- Renaming or altering `remind_me` / `forget_reminder`.

## Decisions

### D1 — One new pure module: `src/console.ts`

`src/console.ts` owns the report type, bounded report storage
(`addReport`), report memo rendering (`renderReports`), recall
rendering (`renderRecall`), and the retention constants — the
mirror of `src/reminders.ts`. Alternatives: extending
`reminders.ts` (rejected: different concern, the module's name
would lie); one module per tool (rejected: three fragments too
small to own a file). `request_audit` has no pure logic of its
own — it composes `stripNarrative` + `runPeerAudit`, both already
pure and tested — so its wiring lives in `index.ts`, closing over
`invokeModel` and `directivesAdvisory` exactly as the event hook
does.

### D2 — Reports are records, not constraints

`AgentReport = { kind, text, addedAt }` — no id, not clearable,
not searchable. Reminders are live constraints the agent manages
(ids, forget); reports are events the engineer reads. Kinds:
`blocker`, `deviation`, `outcome`, `note` — an open vocabulary
would render inconsistently; four fixed kinds keep the memo
section scannable. Text hygiene mirrors reminders (FR-025
pattern): whitespace-only rejected with an actionable message,
over-length truncated at 2000 characters with the result saying
so.

### D3 — Retention decouples from render

Today every list is append-bounded at its memo render cap
(solved 5, critiques 3), so "recall what fell off the memo" is
impossible — nothing older exists. This change introduces fixed
internal retention constants in `src/console.ts`:
`SOLVED_RETENTION_CAP = 50`, `CRITIQUE_RETENTION_CAP = 30`.
Append sites in `index.ts` switch from `memoLimits.maxX` to the
retention constants; memo rendering (`takeMostRecent` in
`buildMemo`) is untouched, so memo output is byte-identical.
Reminders keep their single 10-entry bound (agent-curated by
design; depth would only resurrect cleared reminders' neighbors).
Retention is a memory-footprint concern, not a user-facing knob,
so it is a constant rather than a config key; the render caps
remain the configurable surface. Alternative rejected: making
retention configurable (three more precedence-chain entries for a
concern no user has asked to tune).

### D4 — Recall renders what storage holds

`renderRecall(what, input)` returns the requested section(s) as
text: goal, reminders (with ids), solved items (full retained
list), critiques (severity + delivery), or all. Output is bounded
by construction — every list is retention-capped and reminder
text is ≤2000 characters. An unsupported `what` returns an
actionable list of supported values (the forget_reminder unknown-id
pattern); an empty section says so plainly. Recall is read-only:
it never initializes or mutates state beyond `sessionState.get`.

### D5 — On-demand audit reuses the pipeline, not the delivery

`request_audit({ focus })`: reject whitespace-only focus
actionably; strip narrative per `stripMode`; if stripping empties
the focus, return an actionable result without a model call (the
event hook's empty-step rule). Otherwise call
`runPeerAudit([stripped], config, invokeModel, state.goal,
directivesAdvisory)`. Passed: append the stripped focus to
`verifiedSteps` (same trust class as passed reasoning — the audit
is the gate) and report success. Failed: append
`{ text, severity, delivered: true }` to `critiqueLog` and return
the critique in the result — the agent asked for it, so the
in-conversation tool result is the delivery; `deliverCritique`
(steer/interrupt, regeneration budget) is deliberately not
invoked. Alternative rejected: routing failures through
`deliverCritique` — an interrupt would kill the in-flight turn
the agent is mid-way through, punishing the honest act of asking.

### D6 — The on-demand bound

`SessionState.onDemandAuditCount` increments before each audit;
calls beyond `maxOnDemandAudits` (HookConfig; session config →
`OPENCODE_SUPERVISOR_MAX_ON_DEMAND_AUDITS` → default 8) return an
actionable result naming the bound and noting the automatic audit
loop still runs. The bound lives on `HookConfig` beside
`memoLimits`, not on `AuditConfig` (which `runPeerAudit` receives
and does not need). Failed on-demand audits do not consume the
regeneration budget (no regeneration is requested).

### D7 — Memo section order

`buildMemo` renders: goal, directives, reminders, solved items,
agent reports, critiques. Reports sit with progress context
(solved items) and ahead of critiques so supervision feedback
stays the closing section. `MemoInput` gains optional
`agentReports`; `MemoLimits` gains required `maxReports` (default
5, env `OPENCODE_SUPERVISOR_MEMO_MAX_REPORTS`, session
`memoLimits` override) — required rather than optional so every
constructed limits object states its bound; the compiler surfaces
every literal to update.

### D8 — Trust boundary: reports never reach the auditor

Agent-authored text joins audit prompts only as data under
review: reasoning text today, `request_audit` focus tomorrow.
Reports are not under review — they are attendant claims — so
nothing passes them to `runPeerAudit`, and the memo that renders
reports goes to the supervised session's system prompt, never to
the auditor's self-contained prompt (goal + steps + directives
only). This is FR-042 by construction; the test asserts the
invoked model's prompt contains no report text.

## Risks / Trade-offs

- [Report flooding: the agent spams reports to crowd the memo]
  → Bounded to the most recent `maxReports` (5) at ≤2000
  characters each (~10 KB worst case); the section label marks
  every entry as agent-reported, so provenance stays legible.
- [Trace laundering: the agent launders paths into the verified
  trace via passing focus text] → Same gate as reasoning steps —
  the peer audit must pass first — and the tool guard's other
  checks (reward-hacking patterns, directive enforcement) still
  apply. No new authority is granted.
- [Focus-text prompt injection into the auditor side session]
  → Same class and same position (reviewed data) as reasoning
  text the loop already audits; the auditor prompt frames input
  as data, and no report text ever rides along (D8).
- [On-demand token burn] → Bounded to 8 per session (D6) and
  inherit the auditor's existing timeout/fail-open behavior.
- [Retention raises per-session memory] → 50 solved one-liners +
  30 critique records ≈ tens of KB per session, in-process only,
  cleared on dispose.

## Migration Plan

Additive; no config or API breaks except the `MemoLimits`
required-field addition (compile-time only; all construction
sites are in-repo). Ship as 2.3.0. Rollback = revert the release;
no stored state outlives the process.
