# Proposal

## Why

Two production failures trace to the same plugin:

1. The auditor model is hardcoded to `google/gemini-3.8-flash`
   (`index.ts` pluginConfig defaults). No `google` provider exists on
   this machine, so every supervisor-audit side session fails with
   `ProviderModelNotFoundError`. The plugin fails open, recording each
   step as verified — the LLM audit tier has been silently dead since
   the model slug drifted from the installed providers.
2. The plugin writes to stdout/stderr via `console.log/warn/error` at
   twenty call sites. The plugin runs inside the OpenCode server
   process, so those lines interleave with the TUI and corrupt the
   display. The per-step fail-open warning (one per failed audit)
   sprays the terminal during normal sessions.

The OpenCode SDK already offers the right sink: `client.app.log`
(POST /log) writes to the server log (`~/.local/share/opencode/log/
opencode.log`) with a service tag, level, and message.

## What Changes

- Added: `src/plugin-log.ts` — a plugin logger that routes info/
  warn/error to the OpenCode server log through `client.app.log`,
  never to stdout/stderr. Delivery is fire-and-forget (a down server
  listener during bootstrap never rejects), warn/error lines dedupe
  per process so per-step failure loops cannot spray the log, and
  info lines (identity, triggers, grants) are never deduplicated.
- Added: all twenty `console.*` call sites in `index.ts` are
  replaced by the plugin logger; the identity/version line moves to
  the first hook invocation so the HTTP listener is up when it is
  written.
- Added: `src/config-file.ts` — pure parsing for supervisor config
  files. Project file: `<project>/.opencode/supervisor/config.json`.
  Global file: `${XDG_CONFIG_HOME:-~/.config}/opencode/supervisor/
  config.json`. Any subset of the hook config may be set; files are
  size-bounded; absent files are absent; malformed files are skipped
  with one warning.
- Added: plugin tuple options accept a `config` object alongside
  `directives`.
- Changed: the auditor model is no longer hardcoded. Resolution
  order per knob: session override (tests) → environment
  (`OPENCODE_SUPERVISOR_MODEL` / `_VARIANT`) → project config file →
  plugin options → global config file → derived from the OpenCode
  configuration (`small_model`, else `model`, via
  `client.config.get`, resolved lazily and memoized on success) →
  unset.
- Changed: when no auditor model resolves, the LLM tier is skipped —
  deterministic invariants still run, steps still verify, and one
  warning is logged. The auditor variant is optional end to end and
  omitted from the side-session prompt when unset.
- Changed: version 2.5.0 (backward-compatible minor).

## Capabilities

### New Capabilities

- `supervisor-logging`: the plugin's log sink — server-log routing
  via the SDK client, fire-and-forget delivery, dedupe, and the
  no-stdout/stderr guarantee (FR-043..FR-046).
- `auditor-config`: where the auditor model comes from — the config
  files, the resolution chain, the derived fallback, and the
  no-model behavior (FR-047..FR-051).

### Modified Capabilities

None. `reasoning-audit` (FR-004, FR-005) gains its model-config and
logging behavior through the `auditor-config` and
`supervisor-logging` deltas to stay self-contained, following the
agent-reminders precedent.

## Impact

- **Code**: new `src/plugin-log.ts`, new `src/config-file.ts`;
  `index.ts` (logger threading, config resolution, identity line,
  twenty console sites); `src/auditor.ts` (optional model/variant,
  invariant-only path); `package.json` (2.5.0).
- **Docs**: `README.md` (config table, config-file section, logging
  section), `CHANGELOG.md` (2.5.0), `AGENTS.md` (config-resolution
  bullet), `skills/reasoning-auditor/skill.md` (model references).
- **Users**: the TUI stays clean; audits run against a model that
  exists; behavior is identical when `OPENCODE_SUPERVISOR_MODEL` is
  already set.
- **Out of scope**: per-session runtime model overrides (the session
  config tier stays test-only), log persistence beyond the OpenCode
  server log, structured log filtering/search.
