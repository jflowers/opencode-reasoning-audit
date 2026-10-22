# Design

## Context

See proposal.md for motivation. Current state: `index.ts` calls a
nonexistent plugin API, so the plugin never loads; `src/` modules
(`stripper.ts`, `auditor.ts`, `tool-guard.ts`) are pure and mostly
reusable. The target runtime is public OpenCode 1.19.x with
`@opencode-ai/plugin` (the `server(input) => hooks` shape already
proven by this repo's `.opencode/plugins/*`). Available hooks:
`event`, `chat.message`, `chat.params`, `tool.execute.before`,
`tool.execute.after`, `permission.ask`,
`experimental.chat.system.transform`,
`experimental.chat.messages.transform`, and `input.client`
(OpenCode HTTP client with `session.prompt`). The anomalyco dev
V2 API (`@opencode/plugin`, `aisdk.language` model wrapping) is
out of scope for this change.

## Goals / Non-Goals

**Goals:**

- Thin, stateful hook layer in `index.ts`; all logic in pure
  `src/` modules with injected boundaries (no OpenCode imports in
  `src/`).
- Fail-open supervision: audit failures never crash or stall the
  supervised session.
- Bounded intervention: at most `maxRegenerations` steer critiques
  per session; memo content capped.
- Every externally observed behavior maps to a spec requirement
  (FR-001..FR-017).

**Non-Goals:**

- Streaming reasoning observation or mid-stream abort (dev V2
  `aisdk.language` only — deferred).
- Knowledge-store (Dewey) lookups for solved-item recall.
- `skills/reasoning-auditor/skill.md` rewrite.
- Supporting both API generations from one entry point.

## Decisions

### D1: Hook mapping (public API only)

| Concern | Hook | Notes |
|---|---|---|
| Reasoning observation | `event` | Dedupe by part/message identity; audit completed reasoning parts once (FR-001). Fire-and-forget; plugin holds state. |
| Goal capture | `chat.message` | First user message per session (FR-013). |
| Tool guard | `tool.execute.before` | Sync regex checks run before every tool (FR-009..FR-012). |
| Solved items | `tool.execute.after` | Append bounded log entries (FR-014). |
| Memo injection | `experimental.chat.system.transform` | Append memo section (FR-016). |
| Critique delivery | `input.client.session.prompt` | Steer prompt at next turn (FR-007); `session.interrupt` on severe (FR-008). |

Alternative considered: dev V2 `session.hook("context")` +
`aisdk.hook("language")` gives richer interception (notably
mid-stream abort), but requires running a dev build of OpenCode.
Deferred; the pure `src/` boundary keeps a later port cheap.

### D2: Auditor side session via `input.client`

`runPeerAudit` receives an injected `invokeModel` function.
`index.ts` implements it with `input.client.session.prompt` in a
dedicated auditor session (pattern: `.opencode/lib/agent-executor.ts`
`executeAgentSession`), using the configured auditor model/variant.
The audit call adds no messages to the supervised conversation
(FR-004). `OPENCODE_AUDITOR_ENDPOINT` HTTP fallback is removed
(side session only, per decision). JSON verdict parsing is
lenient (extract first JSON object); parse failure fails open
(FR-005). Alternative considered: keeping the HTTP endpoint as
fallback — rejected to reduce surface; it can return later behind
config if needed.

### D3: Severity model

Deterministic invariants map: arithmetic errors and off-by-one
bounds → `minor` (steer critique, FR-007); reward-hacking markers
in reasoning → `severe` (interrupt + steer, FR-008). The
peer-audit verdict carries severity; the auditor prompt includes
the session goal so it can flag scope drift as `minor` findings.

### D4: State and lifecycle

Module-level Maps keyed by session ID (existing convention):
goal, verified steps, critique count, solved items, critique log.
The `event` hook is fire-and-forget, so the plugin owns all
state. Audit runs asynchronously per completed reasoning part;
a session's Maps are its only shared state. No persistence —
state dies with the opencode process, matching v0 behavior.

### D5: Audit latency and the tool guard race

The LLM audit takes seconds; tool calls may arrive before the
audit completes. The tool guard's reward-hacking checks are
synchronous regex and never racy; the file-path trace check is
best-effort: it reads whatever verified trace exists at call
time, and MUST NOT block when the trace is empty (FR-011).
Accepted trade-off: a tool call racing an in-flight audit sees a
partial trace. Blocking pending audits would stall the agent,
which contradicts fail-open supervision.

### D6: Spike-first verification

Four unknowns are resolved by a read-only spike before wiring
(fallbacks listed): exact public event payload shapes for
completed reasoning parts (fallback: temporary probe plugin that
logs events); `delivery: "steer"` on the public client's
`session.prompt` options (fallback: interrupt + memo-only
critique); whether throwing in `tool.execute.before` blocks the
call (fallback: `permission.ask` deny); plugin entry export shape
expected by `bunx oh-my-opencode install --local .` (fallback:
mirror `.opencode/plugins/*` named-export shape).

## Risks / Trade-offs

- [Experimental hooks (`system.transform`) change across OpenCode
  upgrades] → spike verifies against installed 1.19; hook
  registration wrapped so absence degrades to memo-less operation
  rather than plugin load failure; README documents the tested
  version.
- [Event-shape ambiguity causes missed or duplicate audits] →
  spike confirms shapes; dedupe keyed by stable part identity;
  duplicate audits are idempotent for invariants and bounded for
  LLM calls.
- [Steer unavailable on public client] → D6 fallback (interrupt +
  memo-only critique) preserves FR-007's bound and recording
  behavior with weaker delivery.
- [Auditor side session adds latency/cost per reasoning step] →
  auditor model defaults to a cheap fast model; invariants run
  first and short-circuit; fail-open on errors.
- [Plugin state lost on restart] → accepted; matches v0 and the
  session-scoped nature of supervision.

## Migration Plan

No user migration: the plugin has never loaded successfully, so
no working deployments exist. Deploy: implement, test, register
with `bunx oh-my-opencode install --local .`, smoke-test in a
live session. Rollback: unregister the plugin or revert the
merge. `OPENCODE_AUDITOR_ENDPOINT` users (if any experimented)
lose the env var — called out in CHANGELOG.

## Open Questions

- Solved-items entry shape (tool name + result title vs. longer
  summary) — resolved during implementation; spec only requires
  tool plus short outcome.
- Auditor session reuse (one per audit vs. one per supervised
  session) — resolved during implementation for cost/latency;
  either satisfies FR-004.
