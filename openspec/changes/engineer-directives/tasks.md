# Tasks

## 1. Spec artifacts

- [x] 1.1 Write proposal, design, spec delta, and tasks for the
  engineer-directives change and commit them before implementation.
  Verify: artifacts exist under openspec/changes/engineer-directives/
  and are the first commit on the branch.

## 2. Implementation

- [x] 2.1 Implement src/directives.ts as a pure module: Directive,
  EnforcementRule, and TriggerRule types; parseDirectives (markdown
  body + supervisor-fenced JSON rules); globToRegExp; compile,
  match, active-set, and bounded-render functions; fixed bounds
  (FR-026, FR-027, FR-032). Verify: module functions are pure and
  covered by 3.1.
- [x] 2.2 Extend src/tool-guard.ts: optional compiled-enforcement
  parameter on verifyToolIntent, enforcement check between the
  reward-hacking and trace checks, actionable block reasons, and an
  exported extractArgPaths helper (FR-028). Verify: guard tests in
  3.1 and 3.2.
- [x] 2.3 Extend src/auditor.ts: optional directivesText parameter
  on runPeerAudit and the prompt section after the goal section
  (FR-031). Verify: auditor prompt test in 3.2.
- [x] 2.4 Extend src/memo.ts: optional directives input, Directives:
  section between goal and reminders, null-check inclusion, bounded
  rendering via src/directives.ts (FR-030). Verify: memo tests in
  3.1 and 3.2.
- [x] 2.5 Wire index.ts: server gains the options parameter; private
  directive-file loader (fs only here); directive load + compile at
  server start with identity-log directive count; trigger recording
  in tool.execute.before (SessionState += triggeredDirectives);
  active-directive filtering in the system transform; auditor call
  site passes directives text (FR-026, FR-029). Verify: integration
  tests in 3.2 and both test suites green.

## 3. Tests

- [x] 3.1 Write test/directives.test.ts module tests: parse (body +
  fence, malformed skip), glob matching (star, double-star,
  basename), compile (invalid regex skip), bounds (count, text,
  rules), render (budget, truncation note), guard (forbid-path and
  forbid-pattern block, empty never blocks, reason content), memo
  section, active-set filtering. Verify: bun test passes the new
  file.
- [x] 3.2 Write integration tests in test/directives.test.ts:
  temp-dir loader through plugin.server (files load, malformed
  skipped, options.directives merge), trigger recording via
  tool.execute.before (tool name, path glob, blocked-call trigger),
  memo end-to-end with directives, auditor prompt includes
  directives. Verify: both runners pass the full suite.

## 4. Verification and docs

- [x] 4.1 Run bun test and node --test on all four test files and
  confirm parity. Verify: both suites pass with identical counts.
- [x] 4.2 Docs gate: CHANGELOG 2.2.0 entry; README engineer-console
  section (file format, tuple registration, rule reference, config
  table) and enumeration sweep (hook map, session state, surfaces,
  dual-distribution differentiator, roadmap); AGENTS.md structure
  tree, test command file list, and enumerations; package.json
  version 2.2.0 and test:node file list. Verify: grep for stale
  enumerations returns nothing new.

## 5. Publication

- [x] 5.1 File the documentation issues: this repo (label
  documentation) and unbound-force/website cross-repo. Record both
  issue numbers in this file. Verify: gh issue view shows both.
  Filed: jflowers/opencode-supervisor#15 and
  unbound-force/website#328.
- [ ] 5.2 Run /uf.review-council and resolve every REQUEST CHANGES.
  Record the verdict and iteration count here. Verify: consolidated
  verdict is APPROVE or APPROVE WITH ADVISORIES.
- [ ] 5.3 Open the PR opsx/engineer-directives -> main and archive
  the change via the opsx archive workflow after merge. Record the
  PR number here. Verify: PR is open, assigned, and references this
  change.

## Workflow follow-up

- Change D (supervisor-tools) builds on this change's options
  channel and state layer.
- Advisory issues #9 and #13 stay fast-follow; nothing here resolves
  them.
