# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

Spec deltas: `openspec/changes/audit-supervisor/specs/reasoning-audit/spec.md`,
`openspec/changes/audit-supervisor/specs/tool-guard/spec.md`,
`openspec/changes/audit-supervisor/specs/supervisor-memo/spec.md`.

### Added

- Rebuilt the plugin onto the real `@opencode-ai/plugin` Hooks API
  (`event`, `chat.message`, `tool.execute.before`,
  `tool.execute.after`, `experimental.chat.system.transform`) — the
  plugin now actually loads; the previous entry targeted nonexistent
  OpenCode APIs and never registered.
- Reasoning audit with critique delivery: a failed audit steers the
  session with a corrective prompt; severe findings interrupt the
  session first. The whole intervention — the severe interrupt and
  every delivered critique — is bounded by `maxRegenerations` per
  session.
- Tool guard with actionable blocks: reward-hacking tool calls are
  blocked before execution with a reason the model can act on; file
  paths absent from the verified reasoning trace are blocked, and an
  empty trace never blocks.
- Supervisor memo: the session goal, recently solved items, and recent
  critiques are appended to the system prompt before each model call.
- Severity classification (`minor` | `severe`) on audit outcomes, with
  the session goal passed to the audit prompt for scope-drift findings.
- Configuration knobs for the new behavior — `maxRegenerations`,
  `stripMode`, `blockRewardHacking`, `requireStepReferenceInTools`,
  and `memoLimits` — resolved session plugin config → environment →
  defaults.

### Changed

- Peer audits run in a dedicated auditor side session driven by the
  OpenCode client (`session.prompt`); audit traffic never enters the
  supervised conversation, and auditor errors fail open.
- Registration and configuration documentation corrected to the real
  mechanisms (the OpenCode `plugin` config array, the
  `opencode plugin` command, and the `OPENCODE_AUDITOR_*` variables);
  the previously documented install command never existed in any
  published version of its tool.

### Removed

- **BREAKING**: `OPENCODE_AUDITOR_ENDPOINT` — the HTTP auditor
  fallback no longer exists; audits run only through the auditor side
  session.
- **BREAKING**: the middleware surface built on the nonexistent
  `onMessageUpdated` / `onToolExecute` lifecycle hooks, including the
  `session.injectMessage` / `session.regenerate` repair loop —
  replaced by the Hooks API surface above.
- The orphaned `injectRole` configuration knob. It was declared on
  `AuditConfig`, defaulted in `pluginConfig`, and carried through the
  fixtures, but no code ever read it — removing it changes no
  behavior.
