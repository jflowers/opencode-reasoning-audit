# Proposal

## Why

The agent console's first slice (2.1.0) gave the supervised agent
write access to one corner of the session-state layer: reminders.
The layer already holds more the agent cannot reach. The memo
renders only the most recent solved items and critiques, so older
entries fall out of view permanently with no way back. There is no
channel for the agent to self-report blockers or deviations for
the engineer — the state layer records what the agent did, never
what the agent noticed. And the peer audit fires only when a
reasoning part completes: the agent cannot ask for an audit at a
decision point before acting on a risky step.

The locked roadmap (README Section 10) names these as the agent
console's remaining tools — recall, report, and on-demand audit —
all on the same session-state layer, extending the pattern
remind_me / forget_reminder established.

## What Changes

- Add a `recall` tool: retrieves stored supervision state (goal,
  reminders, solved items, critiques) for the calling session in
  full, bypassing the memo's recency caps, so entries that fell
  off the bounded memo remain reachable. Read-only.
- Add a `report` tool: records a self-reported event — blocker,
  deviation, outcome, or note — in bounded session state. Active
  reports render in a new bounded memo section, and the tool
  result echoes the stored text (the same in-conversation delivery
  that survives gateway memo drops as reminders).
- Add a `request_audit` tool: runs the existing audit pipeline
  (strip narrative, deterministic invariants, side-session peer
  audit) on caller-supplied focus text. Passed focus enters the
  verified trace; failed focus returns the critique in the tool
  result — solicited, so no steer or interrupt. Bounded per
  session so a looping agent cannot burn auditor tokens.
- The memo gains a bounded "Agent reports" section (new
  `memoLimits.maxReports` cap, default 5, resolved through the
  session-config / env / default precedence chain).
- A new per-session bound on on-demand audits
  (`maxOnDemandAudits`, default 8) with the same precedence chain.
- Side sessions stay inert for all three tools (no state, never an
  error), and tool bodies never throw — odd payloads yield
  actionable results (fail-open, the FR-005 pattern).
- Self-reported text is recorded and surfaced only. It never
  enters audit prompts or becomes audit criteria — agent-authored
  text stays on the agent side of the trust boundary.
- Documentation: README Section 7.4 grows the three tools, AGENTS.md
  structure and roadmap entries, CHANGELOG 2.3.0.

## Capabilities

### New Capabilities

- `supervisor-tools`: the agent console's second slice — recall
  (read access to stored supervision state), report (self-reported
  events recorded and surfaced through the memo), and
  request_audit (on-demand peer audit of caller-supplied focus),
  including memo rendering, capacity bounds, side-session
  inertness, and fail-open behavior.

### Modified Capabilities

None — `openspec/specs/` declares no main specs on this branch;
the memo and reminder requirements this change builds on live in
their originating changes (audit-supervisor, agent-reminders), and
their observable behavior is unchanged.

## Impact

- **Code**: `index.ts` (tool map registration, session state,
  config resolution); new pure module `src/console.ts` (report
  storage and rendering, recall rendering); `src/memo.ts`
  (MemoInput and MemoLimits gain agent reports).
- **Configuration**: `memoLimits.maxReports` and
  `maxOnDemandAudits` added to the existing precedence chain
  (session plugin config, environment variables, defaults).
- **Tests**: new `test/console.test.ts` mirroring the module
  (storage, rendering, bounds) plus hook-layer tests for the three
  tools; existing suites unchanged.
- **Docs**: README (Sections 5.1, 5.4, 7.4, 10), AGENTS.md
  (overview roadmap, structure, architecture, test commands),
  CHANGELOG 2.3.0; blog and tutorial follow-up issues per the
  documentation gate.
- **Compatibility**: no breaking changes — existing tools, memo
  sections, and config keys are untouched; the new caps default on.
