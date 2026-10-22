# AGENTS.md — opencode-reasoning-audit

## Project Overview

OpenCode middleware plugin that audits, interrupts, and repairs AI reasoning steps before the AI completes its action. It hooks `onMessageUpdated` and `onToolExecute`, strips persuasive narrative from Chain-of-Thought steps, runs an independent peer-audit model over the formal steps, and injects structured critiques that trigger self-correction via `session.regenerate()`.

- **Type**: OpenCode middleware plugin (TypeScript library)
- **Runtime**: Bun (primary) / Node 22+ (fallback)
- **License**: MIT
- **Repository**: github.com/jflowers/opencode-reasoning-audit

## Build & Test Commands

```bash
# Test (Bun — primary)
bun test

# Test (Node 22+)
node --test test/audit.test.ts

# Register the plugin with OpenCode (local development)
bunx oh-my-opencode install --local .
```

- No build step: OpenCode executes the TypeScript directly.
- No lint step is configured; match existing code style.
- No CI workflows are defined in this repository.

## Project Structure

```text
opencode-reasoning-audit/
├── index.ts               # Plugin entry: onMessageUpdated/onToolExecute hooks, pluginConfig
├── src/
│   ├── auditor.ts         # Peer audit: config resolution, deterministic invariants, LLM audit
│   ├── stripper.ts        # Narrative stripping (code_and_math / balanced / strict)
│   └── tool-guard.ts      # Tool intent verification and reward-hacking blocks
├── test/
│   └── audit.test.ts      # Unit tests (node:test, runs under Bun and Node)
├── skills/
│   └── reasoning-auditor/ # Standalone skill alternative (no middleware required)
├── openspec/              # OpenSpec change management (changes/, specs/, schemas/)
├── .specify/              # Constitution and speckit memory
├── .opencode/             # Agents, commands, plugins, skills, convention packs
└── opencode.json          # OpenCode config: MCP servers (dewey, replicator), local plugins
```

## Coding Conventions

- **Language**: TypeScript, ESM (`"type": "module"`). Use extension-ful relative imports (`import ... from './src/stripper.ts'`).
- **Style**: 2-space indentation, single quotes, semicolons. No linter is configured — match the existing files.
- **Module headers**: every file in `src/` starts with a JSDoc block describing the module's purpose.
- **Types**: export interfaces for config and result shapes (`AuditConfig`, `PeerAuditOutcome`, `ToolVerificationResult`); prefer string-literal union types for enums (`'code_and_math' | 'balanced' | 'strict'`).
- **Purity**: keep `src/` functions pure and testable; session state and OpenCode hooks live only in `index.ts`.
- **Configuration**: resolve settings through a precedence chain (session plugin config → environment variables → `pluginConfig` defaults).
- **Spec writing**: RFC 2119 language (MUST/SHOULD/MAY), Given/When/Then scenarios, FR-NNN requirement numbering, line length under 72 characters.

## Testing Conventions

- **Framework**: `node:test` with `node:assert/strict` (no external assertion libraries). Runs under both `bun test` and Node 22+ (`node --test`).
- **Naming**: behavior-descriptive test titles (e.g., `test('stripNarrative isolates code and math steps', ...)`).
- **Location**: `test/*.test.ts`.
- **Isolation**: mock session objects (`injectMessage`, `regenerate`) for lifecycle-hook tests; no network or filesystem dependencies.
- **Coverage**: every new `src/` function gets at least one test covering observable behavior (constitution principle IV).

## Behavioral Rules

These rules are non-negotiable. Violations are CRITICAL severity.

- **Gatekeeping**: MUST NOT modify quality/governance gates
  (coverage thresholds, CRAP scores, severity definitions,
  CI flags, agent settings, constitution MUST rules, review
  limits, workflow markers). Stop and report instead.
- **Phase boundaries**: MUST NOT cross workflow phase boundaries.
  Spec phases: spec artifacts only. Implement: source code.
  Review: fixes only. Violation = process error, stop immediately.
- **CI parity**: MUST replicate CI checks locally before marking
  tasks complete. Derive commands from `.github/workflows/`.
- **Review council**: MUST run `/uf.review-council` before PR
  submission. Resolve all REQUEST CHANGES. No code changes
  between APPROVE and PR. Exempt: constitution amendments,
  docs-only, emergency hotfixes.
- **Branch protection**: MUST NOT commit directly to `main`.
  All changes via feature branches and PRs.
- **Documentation gate**: Before marking a task complete,
  assess documentation impact: `CHANGELOG.md` for change
  entries, `AGENTS.md` for structural updates (project
  structure, conventions, build commands), `README.md` for
  description changes.
- **Documentation gate**: MUST file a documentation issue
  against the current repo for user-facing changes before
  PR merge. Exempt: internal refactoring, test-only,
  CI-only, spec artifacts.
- **Zero-waste**: No orphaned specs, unused standards, or
  aspirational documents that do not map to actionable work.

### PR Review Commands

| Command | When | Scope |
|---------|------|-------|
| `/uf.review-council` | Pre-PR (local) | 5+ Divisor agents |
| `/uf.review-pr [N]` | Post-PR (GitHub) | Single agent, CI analysis |

## Specification Workflow

All non-trivial changes MUST be preceded by a spec workflow.

| Tier | Tool | When | Artifacts |
|------|------|------|-----------|
| Strategic | Speckit | >= 3 stories, cross-repo | `specs/NNN-*/` |
| Tactical | OpenSpec | < 3 stories, single-repo | `openspec/changes/*/` |

Pipeline: `constitution → specify → clarify → plan → tasks →
analyze → checklist → implement`

**Ordering**: Constitution before specs. Spec before plan. Plan
before tasks. Tasks before implementation. Spec artifacts MUST
be committed/pushed before implementation begins.

**Branches**: Speckit: `NNN-<name>`. OpenSpec: `opsx/<name>`.

**Task bookkeeping**: Mark checkboxes `[x]` immediately on
completion. `[P]` marks parallel-eligible tasks.

**When in doubt**: Start with OpenSpec. Escalate to Speckit if
scope grows beyond 3 stories or crosses repo boundaries.

**What requires a spec**: New features, refactoring that changes
signatures, test additions across multiple functions, agent
changes, CI changes, data model changes.

**Exempt**: Constitution amendments, typo fixes, emergency
hotfixes (retroactively documented).

## Knowledge Retrieval

Prefer Dewey MCP tools over grep/glob/read for cross-repo
context and architectural patterns.

| Intent | Tool |
|--------|------|
| Conceptual | `dewey_semantic_search` |
| Keyword | `dewey_search` |
| Navigation | `dewey_traverse`, `dewey_get_page` |
| Discovery | `dewey_find_connections`, `dewey_similar` |

**Fallback**: Use Read/Grep/Glob when Dewey is unavailable,
for exact string matching, known file paths, or non-Markdown
content (Go source, JSON, YAML).

## Convention Packs

This repository uses convention packs scaffolded by
unbound-force. Agents MUST read the applicable pack(s)
before writing or reviewing code.

- `.opencode/uf/packs/ci.md`
- `.opencode/uf/packs/ci-custom.md`
- `.opencode/uf/packs/content.md`
- `.opencode/uf/packs/content-custom.md`
- `.opencode/uf/packs/default.md`
- `.opencode/uf/packs/default-custom.md`
- `.opencode/uf/packs/go.md`
- `.opencode/uf/packs/go-custom.md`
- `.opencode/uf/packs/python.md`
- `.opencode/uf/packs/python-custom.md`
- `.opencode/uf/packs/review-voice.md`
- `.opencode/uf/packs/review-voice-custom.md`
- `.opencode/uf/packs/severity.md`
- `.opencode/uf/packs/typescript.md`
- `.opencode/uf/packs/typescript-custom.md`

## Architecture

- **Middleware pattern**: `index.ts` exports the plugin default object with two OpenCode lifecycle hooks (`onMessageUpdated`, `onToolExecute`); all logic lives in pure `src/` modules.
- **Audit pipeline**: strip narrative (`stripNarrative`) → peer audit (`runPeerAudit`: deterministic invariant checks first, then LLM verification) → repair loop (`injectMessage` + `regenerate`, bounded by `maxRegenerations` and the `is_audited` flag to prevent infinite loops).
- **Tool guard**: `verifyToolIntent` blocks reward-hacking patterns and file paths absent from the verified reasoning trace before any tool executes.
- **Config resolution**: `resolveAuditorConfig` applies session → env → default precedence so users can override the auditor model without code changes.
- **Session state**: module-level Maps track verified steps and regeneration counts per session ID.
- **Dual distribution**: the same audit behavior ships as middleware (`index.ts`) or a standalone skill (`skills/reasoning-auditor/skill.md`).
