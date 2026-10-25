# Design: engineer-directives

## Context

Change B shipped the agent console (`remind_me` / `forget_reminder`):
tools the agent calls on itself. The engineer console is the mirror —
policy the supervising engineer authors, carried by the supervisor.
The locked architecture (change proposal, README 10) puts both
consoles on one session-state layer rendered through one memo
pipeline, with the audit loop as the automated third pillar.

Directives must be: authored where engineers already work (repo files
plus opencode.json), enforced where the supervisor already acts (tool
guard), surfaced where the agent already reads (memo), and audited
where drift is already caught (peer audit). No new runtime
dependencies.

## Goals

- Engineers can state project policy once, in files or config.
- Enforcement rules block matching tool calls with actionable
  reasons; advisory text rides the memo and the audit prompt.
- Trigger rules keep contextual directives out of the way until a
  relevant tool call happens (JIT surfacing).
- Loading is deterministic, bounded, and fail-open.

## Non-Goals

- Per-session or per-directive enable toggles.
- Hot reload of directive files (a plugin reload picks up changes).
- Rule kinds beyond forbid-path and forbid-pattern (v2 candidates:
  require-approval via ToolContext.ask, branch protection).
- Natural-language rule interpretation.

## Decisions

### D1. Sources: repo files plus tuple-registration options

Directives load from `.opencode/supervisor/directives/*.md` under the
project directory (filename-sorted, deterministic) and from
`options.directives` in opencode.json via tuple registration
`["./index.ts", { "directives": [...] }]`. The `Plugin` type is
`(input, options?) => Promise<Hooks>`; `server` gains the second
parameter. Files win for authoring ergonomics; options win for
machines. Rejected: directives as env vars (no multiline), as a
single JSON file (worse diffs), session-scoped (policy is project
state, not session state).

### D2. File format: markdown body + `supervisor` fenced JSON

A directive file is markdown. The advisory text is the body. The
first fenced code block tagged `supervisor` holds a JSON object:
`{"enforce": [...], "when": [...]}`. The id is the filename stem.
JSON.parse is built in, matching the lenient-JSON precedent in the
auditor. Rejected: YAML frontmatter (no parser, hand-rolling nested
YAML is fragile), a custom DSL (another grammar to test).

### D3. Purity split: loader in index.ts, everything else pure

`index.ts` reads the directory (readdirSync/readFileSync, wrapped in
try/catch) and passes `{name, content}[]` to pure functions in
`src/directives.ts`. This keeps the src/ purity convention: fs lives
only in the hook layer. Tests cover the loader through
`plugin.server(mockInput)` with the directory pointed at temp dirs.

### D4. Hand-rolled glob matcher

`**/` compiles to `(?:.*/)?`, `**` to `.*`, `*` to `[^/]*`, `?` to
`[^/]`; everything else is regex-escaped. A glob matches when it
matches the full path or the basename. Rejected: adding a glob
dependency (the surface needed is small and testable), `minimatch`
semantics (too much machinery for forbid lists).

### D5. forbidPattern is a case-insensitive regex; trust is config

Patterns compile with `new RegExp(pattern, 'i')`. Directive files and
opencode.json are engineer-authored config, the same trust tier as
plugin code — regex is a feature, not an injection vector. Invalid
regexes skip the rule with a logged warning (fail-open). Rejected:
substring-only matching (weaker than the name promises).

### D6. Enforcement check sits between reward hacking and trace

`verifyToolIntent` order: reward-hacking, directives, trace. The
reward-hacking check stays first (core safety); engineer policy
outranks the best-effort trace heuristic. The compiled-enforcement
parameter is optional; an empty or absent set never blocks, so the
guard's FR-011 guarantee is preserved. Block reasons name the
directive id, the matched path or pattern, and the advisory text —
the reason is the model's corrective signal (FR-012 philosophy).

### D7. JIT triggers recorded in tool.execute.before

Directives with `when` rules surface in the memo only after a tool
call matches (tool name, case-insensitive; or any extracted argument
path matching the when-glob). Evaluation happens in
`tool.execute.before` after the guard decision — a blocked call still
records the trigger, because the attempt itself is signal. Triggered
ids persist for the session (dedup, bounded by the directive count).
`activeDirectives(directives, triggeredIds)` filters: no-when
directives are always active; when-directives are active once
triggered. Rejected: expiring triggers (v1 keeps the simple model).

### D8. Fixed bounds, aggregate render budget

MAX_DIRECTIVES 20, MAX_DIRECTIVE_TEXT 1000, MAX_RULES_PER_DIRECTIVE
10 per kind, MAX_DIRECTIVES_RENDER_BUDGET 4000 characters for the
memo section. Fixed, not configurable — Security by Default, and the
Change B review lesson (memo-design): agent-visible injected channels
need aggregate render budgets, not just per-item caps. 20 x 1000
would be 20KB per model call without the budget.

### D9. Auditor treats directives as drift criteria

`runPeerAudit` gains an optional `directivesText` parameter; the
prompt gains `Engineer directives (flag steps that violate them):`
after the session-goal section. The auditor fails open (FR-005), so
directives extend — never gate — the audit.

## Risks

- **Memo drop**: tested gateways may drop pushed system messages, so
  the memo section may not reach the model. Enforcement does not
  depend on the memo — blocks happen at execution. Documented in
  README 9.
- **Over-blocking**: a broad glob (e.g. `*`) blocks every path-using
  tool call. Mitigations: actionable reasons quote the directive and
  glob; engineers fix the file; fail-open only guards loading, not
  deliberate rules.
- **Regex cost**: a pathological forbidPattern could slow the guard.
  Trusted-config trust tier (D5); accepted.
- **Stale triggers**: a directive triggered once stays surfaced all
  session. Accepted for v1 (D7); bound keeps it finite.

## Constitution Alignment

- **I. Autonomous Collaboration** — PASS: engineer-authored policy
  only; no autonomous behavior changes.
- **II. Composability First** — PASS: rides existing memo, guard, and
  audit planes; zero new dependencies.
- **III. Observable Quality** — PASS: logs on load, skip, block, and
  trigger; identity log reports directive count.
- **IV. Testability** — PASS: pure module + temp-dir integration
  tests for the loader; guard, memo, and auditor extensions tested.
- **V. Security by Default** — PASS: trusted config tier, fixed
  bounds, fail-open loading, empty rules never block.
