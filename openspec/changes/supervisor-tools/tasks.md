# Tasks

## 1. Pure console module (src/console.ts)

- [x] 1.1 Create src/console.ts with the AgentReport type (kind, text,
  addedAt), REPORT_KINDS list, MAX_REPORT_TEXT (2000), and retention
  constants SOLVED_RETENTION_CAP (50) and CRITIQUE_RETENTION_CAP (30).
  Verify: module imports cleanly in a Bun/Node script and constants are
  exported (FR-034, FR-035 basis; design D2, D3).
- [x] 1.2 Implement prepareReportText (trim, reject whitespace-only,
  truncate at 2000 with a truncated flag) and addReport (append-bounded,
  drops oldest beyond cap). Verify: unit tests in test/console.test.ts
  covering whitespace rejection, truncation note, and cap-drop behavior
  pass (FR-034, FR-035).
- [x] 1.3 Implement renderReports (bounded "Agent reports" memo section,
  omitted when empty) and renderRecall (goal / reminders / solved /
  critiques / all views, unsupported `what` returns an actionable
  listing). Verify: unit tests for each `what` value, empty-section
  omission, and the unsupported-value message pass (FR-033, FR-036,
  design D4, D7).

## 2. Memo integration (src/memo.ts)

- [x] 2.1 Add agentReports to MemoInput (optional) and maxReports to
  MemoLimits (required, default 5) with the
  OPENCODE_SUPERVISOR_MEMO_MAX_REPORTS env override in the precedence
  chain; render the bounded
  "Agent reports" section between solved items and critiques. Verify:
  memo integration tests show reports riding the memo, the section
  absent when empty, and existing memo output unchanged when no reports
  exist (FR-036, design D7).

## 3. Hook wiring (index.ts)

- [x] 3.1 Extend SessionState with agentReports and onDemandAuditCount;
  clear them on dispose. Add maxOnDemandAudits to HookConfig with the
  OPENCODE_SUPERVISOR_MAX_ON_DEMAND_AUDITS env override and default 8
  in resolveHookConfig. Verify: config-resolution tests pass for both
  new knobs (session -> env -> default precedence) (FR-035, FR-039,
  design D6).
- [x] 3.2 Switch the solved-items and critique-log append sites from
  memoLimits caps to the console.ts retention constants so stored lists
  outlive the memo's render caps. Verify: a hook-layer test recalls
  more solved items than the memo renders (FR-033, design D3).
- [x] 3.3 Register the recall, report, and request_audit tools in the
  Hooks.tool map beside remind_me / forget_reminder, following the same
  pattern: side-session inert check first, resolveHookConfig for bounds,
  actionable error results, echo text in results. request_audit composes
  stripNarrative and runPeerAudit over the focus text, appends passed
  focus to the verified trace, returns the critique in the tool result
  without steer/interrupt, and enforces the per-session audit bound.
  Verify: hook-layer tests pass for each tool covering success paths,
  side-session inertness, bound exceeded, failed-audit no-steer with
  critique-log record, and passed-audit trace append (FR-033, FR-034,
  FR-037, FR-038, FR-039, FR-040, design D5, D6).
- [x] 3.4 Keep console-tool bodies fail-open: no thrown errors on
  malformed payloads, actionable results instead. Verify: hook-layer
  test with malformed arguments yields a result, not a rejection
  (FR-041).

## 4. Trust boundary

- [x] 4.1 Ensure self-reported report text never enters peer-audit
  prompts: reports ride the memo of the supervised session only. Verify:
  a test storing a report, then running an audit, asserts the invoked
  model prompt does not contain the report text (FR-042, design D8).

## 5. Documentation and review

- [x] 5.1 Update README (§5.1 hook map + tool list, §5.4 module table
  with src/console.ts, §7.1 test command gains test/console.test.ts,
  §7.4 agent-console section for the three new tools, §9 bounds, §10
  roadmap mark shipped), AGENTS.md (overview, structure, architecture,
  test command), package.json scripts (test:node adds the new file),
  and CHANGELOG 2.3.0 with test counts verified against the final diff.
  File the documentation issues per repo convention (in-repo
  verification issue, website capabilities update). Verify: a docs sweep
  finds no stale enumerations — every copy of the test command lists
  five files, and CHANGELOG counts match the test run summary.
- [x] 5.2 Run the full review council on the change diff; resolve all
  REQUEST CHANGES findings with code fixes and regression tests, re-run
  both test runners to green, and record the final verdict here.
  Verify: council artifact shows APPROVE or APPROVE WITH ADVISORIES
  with zero HIGH or CRITICAL findings outstanding.
  Verdict: APPROVE WITH ADVISORIES in a single round at d3fe00cd (0
  HIGH, 0 CRITICAL; artifact .uf/artifacts/dispatch/bcea75a3-f4c9-4b79-
  a59c-07b5e05d10be.json). Documentation advisories fixed in a doc-only
  follow-up commit (README §6 config table + intro/§1/§5.4 memo
  enumerations, AGENTS.md structure comment, CHANGELOG documentation
  bullet, tasks.md env-var wrap); code advisories tracked in #22.
- [ ] 5.3 Open the PR opsx/supervisor-tools -> main and archive the
  change via the opsx archive workflow after merge. Record the PR
  number here. Verify: PR is open, assigned, and references this
  change.

## Workflow follow-up

- Archive the change after the PR merges (opsx archive workflow).
- Extend the tutorial issue #4 with the new console tools (recall,
  report, request_audit) as scope for the walkthrough. Done: scope
  comment posted on #4 (issuecomment-6405060027).
- File a blog-issue follow-up for the 2.3.0 agent-console completion
  if the doc-gate pattern calls for one. Done: #21 (label blog).
- Documentation issues filed: verification #20 (in repo, post-merge
  checklist), blog #21, tutorial scope comment on #4, website
  capabilities update unbound-force/website#330.
- Review-council code advisories tracked in #22 (focus length cap,
  memo/console module cycle, test-harness extraction, cap-0 echo,
  proposal metadata reconciliation at archive time, and LOW items).
  Doc advisories were fixed in-branch post-verdict (doc-only commit).
- Future change: engineer-directive rule kinds (approve-gates, required
  reviewers) remain on the roadmap (README §10).
