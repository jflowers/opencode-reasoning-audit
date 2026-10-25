# Proposal: engineer-directives

## Why

The supervisor is push-only toward the agent: it audits, blocks, and
injects memos, but the engineer supervising the session has no channel
to state project policy that the supervisor itself carries. Engineers
resort to hoping the goal text or AGENTS.md surfaces constraints at the
right moment. The roadmap (README 10) names the engineer console as the
second console on the shared session-state layer: directives the
engineer authors once, enforced and re-injected by the supervisor for
every session in the project.

Engineer directives close that gap. A directive is advisory text plus
optional machine rules: forbid-path globs and forbid-pattern regexes
that block tool calls before execution, and trigger rules that surface
the directive in the memo exactly when the agent touches a matching
tool or path. Directives also join the peer-audit drift criteria and
the memo, so policy rides the same supervision plane as the audit
loop and the agent console.

## What Changes

- New pure module `src/directives.ts`: directive parsing, rule
  compilation, matching, active-set filtering, and bounded rendering.
- Directive sources, merged in deterministic order:
  - `.opencode/supervisor/directives/*.md` in the project directory
    (markdown advisory body; first `supervisor`-tagged fenced block
    holds a JSON rules object).
  - `options.directives` passed via tuple plugin registration
    `["./index.ts", { "directives": [...] }]` in opencode.json.
- Enforcement rules v1 (FR-028): `forbidPath` globs and
  `forbidPattern` regexes. `verifyToolIntent` gains an optional
  compiled-enforcement parameter; matching calls are blocked with an
  actionable reason naming the directive. An empty rule set never
  blocks.
- Trigger rules v1 (FR-029): `tool` names and `path` globs. A
  directive with trigger rules surfaces in the memo only after a tool
  call matches; directives without trigger rules are always in the
  memo.
- Memo gains a `Directives:` section after the session goal (FR-030),
  bounded by a fixed aggregate render budget.
- The peer-audit prompt gains an engineer-directives section (FR-031):
  the auditor flags steps that violate them, like session-goal drift.
- Fixed load bounds and fail-open loading (FR-032): at most 20
  directives, 1000 characters of text each, 10 rules of each kind per
  directive, 4000-character memo render budget. Malformed files and
  invalid rules are skipped with a logged warning; the plugin always
  loads.
- Version 2.2.0.

## Capabilities

### New

- `engineer-directives` (FR-026 .. FR-032): directive sources, file
  format, enforcement rules, trigger rules, memo rendering, audit
  criteria, and bounds.

### Modified

- `supervisor-memo` (FR-030): the memo gains the `Directives:` section
  between the goal and reminders.
- `peer-audit` (FR-031): the audit prompt gains the directives
  section as a violation criterion.
- `tool-guard` (FR-028): `verifyToolIntent` gains the optional
  compiled-enforcement check between the reward-hacking check and the
  trace check.

## Impact

- **Code**: new `src/directives.ts`; `src/tool-guard.ts` gains the
  enforcement check and an exported path-extraction helper;
  `src/auditor.ts` gains the optional directives prompt section;
  `src/memo.ts` gains the directives memo section; `index.ts` gains
  the `options` server parameter, the directive-file loader, trigger
  recording in session state, and call-site wiring.
- **Docs**: README gains the engineer-console section (file format,
  tuple registration, rule reference); AGENTS.md structure and
  enumerations updated; CHANGELOG 2.2.0 entry.
- **Users**: opt-in. Projects without directive files and without
  `options.directives` see no behavior change beyond the version.
- **Out of scope**: remaining Change D agent-console tools
  (recall_progress, report_solved, request_audit, declare_intent,
  acknowledge_critique, refine_goal); advisory issues #9 and #13;
  per-directive enable/disable toggles; directive hot reload.

## Constitution Alignment

### I. Autonomous Collaboration — PASS

Directives are the engineer's supervision channel, authored in repo
files or opencode.json. No change to agent autonomy beyond explicit
engineer policy.

### II. Composability First — PASS

Directives compose with the existing memo, audit, and guard planes
through the same session-state layer. Zero new dependencies: JSON and
regex are built in; glob matching is hand-rolled.

### III. Observable Quality — PASS

Every block and trigger is logged; the memo and block reasons name
the directive id and text. The identity log reports the directive
count.

### IV. Testability — PASS

Parsing, compilation, matching, filtering, and rendering are pure
functions in `src/directives.ts` with module tests; the loader is
covered through temp-dir integration tests; the guard, memo, and
auditor extensions have behavior tests.

### V. Security by Default — PASS

Rules come from the trusted config layer (repo files and
opencode.json, the same trust as plugin code). Bounds are fixed, not
configurable; loading fails open; an empty rule set never blocks.
