# opencode-supervisor

An OpenCode middleware plugin that supervises AI agents while they work: it strips persuasive narrative from Chain-of-Thought steps, runs an independent peer audit in a side session, steers or interrupts the supervised session when a step fails, blocks reward-hacking tool calls before they execute, and keeps the agent oriented with a session memo (goal, solved items, recent critiques).

Formerly `opencode-reasoning-audit` (1.x). The repo and plugin were renamed as the project grows from a reasoning auditor into a supervision plane; see [Section 6.2](#62-migrating-from-1x) for the migration table.

The supervision plane has one automated surface today — the audit loop below — and two consoles: an **agent console** of self-serve tools (`remind_me` / `forget_reminder` ship today, [Section 7.4](#74-agent-console-remind_me--forget_reminder); recall, report, and on-demand audit on the roadmap) and an **engineer console** of directive files ([Section 10](#10-roadmap-two-consoles-on-the-supervision-plane)), all writing one shared session-state layer.

---

## 1. Overview of the Technique

When a primary AI model solves a problem, it produces a Chain-of-Thought (CoT) and tool calls. Standard AI workflows only check the final output. If Step 2 of a 10-step plan contains a logic error, the AI builds Steps 3 through 10 on a false assumption.

This plugin implements **Process Supervision** and **Automated Self-Correction** inside OpenCode. It registers OpenCode plugin hooks and runs this loop:

1. **Observe completed reasoning steps**: The `event` hook receives `message.part.updated` events. When a reasoning part completes (its `time.end` is set), the plugin reads its full text. Each part is audited exactly once, deduplicated by session, message, and part identity.
2. **Strip the narrative text (`stripNarrative`)**: Persuasive conversational text (for example, *"Obviously, this formula is optimal"*) often hides math and logic errors. The plugin removes conversational text and keeps only formal steps (code blocks, equations, and explicit rules).
3. **Audit the formal steps (`runPeerAudit`)**: Deterministic invariant checks run first — arithmetic misstatements, off-by-one loop bounds, and reward-hacking markers fail the audit with no model call. If the invariants pass, an independent auditor model checks the step in a dedicated side session. The audit prompt carries the session goal, so the auditor can also flag scope drift. Steps that pass are recorded in a **verified trace**.
4. **Steer or interrupt**: A failed audit is classified `minor` or `severe`:
   - **Minor** (arithmetic, off-by-one, scope drift): the critique is delivered to the supervised session as a synthetic user message. The agent incorporates it at its next step and self-corrects. Deliveries are bounded by `maxRegenerations` per session; critiques over the bound are recorded without delivery.
   - **Severe** (reward hacking): the session is interrupted (`session.abort`) first, then the critique is delivered the same way. The whole intervention — the interrupt and the delivery — is bounded by the same `maxRegenerations` per session; past the bound, severe findings are recorded without interrupting or delivering.

Two more surfaces complete the supervision:

- **Tool guard** (`tool.execute.before`): before any tool runs, the plugin blocks reward-hacking patterns and file paths that do not appear in the verified trace. A block throws, so the model receives the reason as a tool error it can act on. An empty trace never blocks.
- **Supervisor memo** (`experimental.chat.system.transform`): before each model call, the plugin appends a bounded memo — session goal, reminders, recently solved items, recent critiques — to the system prompt. This is a plugin-side append: whether the model actually receives the memo depends on the transport honoring pushed secondary system messages (see Section 9).

The supervised agent also gets self-serve tools (`Hooks.tool`): `remind_me` / `forget_reminder` keep durable facts — dead ends, environment quirks, decisions, user constraints — in the supervision state, where they ride the memo and survive context compaction (Section 7.4).

---

## 2. Origin of the Technique

The audit module at this plugin's core is based on the multi-agent reasoning audit and repair framework described in:

- **Source**: [A new framework teaches AI models to audit and repair each other's reasoning, improving accuracy (VentureBeat)](https://venturebeat.com/orchestration/a-new-framework-teaches-ai-models-to-audit-and-repair-each-others-reasoning-improving-accuracy)

### Why This Framework Works

Research shows that when one AI model reviews the full Chain-of-Thought of another AI model, the reviewer model often agrees with wrong answers. This happens because the primary model writes confident narrative text around its mistakes.

The audit-and-repair framework solves this problem in two ways:
1. **Separate Logic from Narrative**: It strips the rhetorical narrative from the reasoning chain so the auditor model sees only the raw logic, math, and code.
2. **Step-Level Repair**: When the auditor finds a broken step, it tells the primary model the exact step number and the exact formal error. The primary model then repairs its reasoning from that step forward.

---

## 3. General Uses

You can use this technique in any workflow where an AI model performs multi-step reasoning:

- **Mathematical and Financial Calculations**: Catch wrong arithmetic (for example, `24 * 15 = 340`) in budgets, capacity plans, and pricing tables before the AI writes the final report.
- **Data Analysis and Scientific Pipelines**: Verify that unit conversions, statistical formulas, and data filters match the input data schema.
- **Compliance and Policy Checks**: Confirm that every step in a decision chain obeys strict regulatory rules before the system sends a response to a user.
- **Multi-Step Planning**: Detect when a later step in a plan contradicts an earlier constraint.

---

## 4. Uses in Software Development

In software engineering, coding agents frequently make subtle logic errors or take unsafe shortcuts. This plugin stops those errors at runtime:

1. **Catch Boundary and Formula Bugs**: Detect off-by-one loop conditions (for example, `for (let i = 0; i <= array.length; i++)`) or wrong algorithms (such as using linear multiplication when the specification requires exponential backoff).
2. **Prevent Security Vulnerabilities**: Catch raw string interpolation in SQL queries (`SELECT * FROM users WHERE id = ${id}`) or unsafe shell commands before the agent writes the code to disk.
3. **Stop Reward Hacking**: When a coding agent cannot fix a failing test, it sometimes tries to cheat ("reward hack"). For example, the agent may add `.skip()` to a test, delete an `assert` statement, or run `git commit --no-verify`. The tool guard blocks these actions before the tool runs.
4. **Block Hallucinated File Paths**: Ensure that the coding agent cannot modify or delete a file unless the verified reasoning steps explicitly name that file.

---

## 5. Architecture

### 5.1 Hook Map

The plugin entry (`index.ts`) default-exports a `PluginModule` (`{ id, server }`, id `opencode-supervisor`); `server(input)` returns this hook map:

| Hook | Purpose |
| :--- | :--- |
| `event` | Observes completed reasoning parts (`message.part.updated`), deduplicates them, strips narrative, runs the invariants and the side-session peer audit, records passed steps in the verified trace, and routes failures to critique delivery. |
| `chat.message` | Captures the first user message of the session as the goal. The goal is never replaced. |
| `tool.execute.before` | Tool guard: blocks reward-hacking tool calls and file paths absent from the verified trace (never blocks when the trace is empty). |
| `tool.execute.after` | Appends a solved item (tool name + short outcome) to a bounded log. |
| `tool` | Agent console: registers the `remind_me` and `forget_reminder` tools the supervised agent can call to keep or clear durable reminders (Section 7.4). |
| `experimental.chat.system.transform` | Appends the supervisor memo to the system prompt. Degrades gracefully (memo-less operation) when the hook is absent. |
| `dispose` | Clears all in-process session state. |

### 5.2 Critique Delivery

Both severities deliver the critique through `session.promptAsync` as a synthetic-marked user part, prefixed `[supervisor]`. Severe findings interrupt first — `session.abort` runs before the delivery, or the abort would kill the corrective turn it exists to start. The whole intervention is bounded by `maxRegenerations` per session: once the bound is spent, critiques (severe included) are recorded without delivery and no further aborts fire. Transport failures are likewise recorded without delivery.

### 5.3 Auditor Side Session

The peer audit runs in a dedicated side session created for each audit through the OpenCode client (`session.prompt`), using the configured `auditorModel` / `auditorVariant`. Audit traffic never enters the supervised conversation. Auditor errors fail open: the step passes, the error is logged, and supervision continues.

### 5.4 Modules

| File | Responsibility |
| :--- | :--- |
| `index.ts` | Hook layer: registers the hooks, owns the per-session state Maps, resolves configuration, drives the auditor side session and critique delivery. |
| `src/stripper.ts` | Narrative stripping (`code_and_math` / `balanced` / `strict`). |
| `src/auditor.ts` | Peer audit: deterministic invariants, injected-model LLM audit, severity classification, goal-aware prompt, model/variant config resolution. |
| `src/tool-guard.ts` | Tool intent verification: reward-hacking patterns and the verified-trace file-path check, with actionable block reasons. |
| `src/memo.ts` | Pure memo builder: bounded goal / reminders / solved-items / critiques sections; produces no memo when there is nothing to show. |
| `src/reminders.ts` | Agent-console reminders: pure storage (add, clear, prepare text) and memo rendering for the `remind_me` / `forget_reminder` tools. |

`src/` modules are pure and testable — they import no OpenCode APIs. Session state and OpenCode hooks live only in `index.ts`. State (goal, verified steps, critique count, solved items, critique log, reminders) is held in module-level Maps keyed by session ID and dies with the opencode process; nothing is persisted.

---

## 6. Configuration

Settings resolve in order of precedence at runtime:

1. **Environment variables** — the `OPENCODE_SUPERVISOR_*` names in the table below.
2. **Defaults** — the `pluginConfig` object at the top of `index.ts`.

> **Note on session plugin config**: the resolver also accepts a
> session-plugin-config override
> (`config.plugins['opencode-supervisor']` on a session object),
> but no runtime hook payload carries one — every hook receives only a
> `sessionID`, and the `chat.params` hook's input exposes session,
> agent, model, provider, and message fields with no plugin config
> (verified against `@opencode-ai/plugin` 1.19.4). That tier is
> reachable only from code that constructs a session object itself;
> configure through the environment instead.

| Knob | Environment variable | Default | Description |
| :--- | :--- | :--- | :--- |
| `auditorModel` | `OPENCODE_SUPERVISOR_MODEL` | `google/gemini-3.8-flash` | The provider and model slug for the auditor side session. Format: `<provider>/<model-id>` (for example, `openai/o3-mini`, `anthropic/claude-3-7-sonnet`, or `google/gemini-3.8-flash`). |
| `auditorVariant` | `OPENCODE_SUPERVISOR_VARIANT` | `low` | The reasoning effort passed to the auditor model. Allowed values: `minimal`, `low`, `medium`, `high`, `default`. |
| `maxRegenerations` | `OPENCODE_SUPERVISOR_MAX_REGENERATIONS` | `2` | The maximum number of interventions per session — delivered critiques and severe interrupts share this bound. Past the bound, critiques (severe included) are recorded without delivery or interrupt. |
| `stripMode` | `OPENCODE_SUPERVISOR_STRIP_MODE` | `code_and_math` | Controls how `stripNarrative()` filters the Chain-of-Thought before the audit. See Section 6.1 below. |
| `blockRewardHacking` | `OPENCODE_SUPERVISOR_BLOCK_REWARD_HACKING` | `true` | When `true`, the tool guard blocks tool calls that contain `--no-verify`, `.skip(`, `expect(true).toBe(true)`, or test deletion commands. |
| `requireStepReferenceInTools` | `OPENCODE_SUPERVISOR_REQUIRE_STEP_REFERENCE_IN_TOOLS` | `true` | When `true`, the tool guard blocks tool calls whose file-path arguments do not appear in the verified reasoning trace. Never blocks when the trace is empty. |
| `memoLimits.maxSolvedItems` | `OPENCODE_SUPERVISOR_MEMO_MAX_SOLVED_ITEMS` | `5` | Cap on solved items kept in state and shown in the memo. |
| `memoLimits.maxCritiques` | `OPENCODE_SUPERVISOR_MEMO_MAX_CRITIQUES` | `3` | Cap on critiques kept in state and shown in the memo. |
| `memoLimits.maxReminders` | `OPENCODE_SUPERVISOR_MEMO_MAX_REMINDERS` | `10` | Cap on reminders kept in state and shown in the memo (the most recent are kept). |

Environment variable values: booleans accept exactly `true` or `false`; numbers must be non-negative; `stripMode` must be one of the three mode names. Invalid values fall through to the next precedence tier.

```bash
export OPENCODE_SUPERVISOR_MODEL="google/gemini-3.8-flash"
export OPENCODE_SUPERVISOR_VARIANT="low"
export OPENCODE_SUPERVISOR_MAX_REGENERATIONS=2
export OPENCODE_SUPERVISOR_STRIP_MODE=code_and_math
export OPENCODE_SUPERVISOR_BLOCK_REWARD_HACKING=true
export OPENCODE_SUPERVISOR_REQUIRE_STEP_REFERENCE_IN_TOOLS=true
export OPENCODE_SUPERVISOR_MEMO_MAX_SOLVED_ITEMS=5
export OPENCODE_SUPERVISOR_MEMO_MAX_CRITIQUES=3
export OPENCODE_SUPERVISOR_MEMO_MAX_REMINDERS=10
```

### 6.1 Understanding `stripMode`

The `stripMode` setting controls how much text `stripNarrative()` removes from each reasoning step:

- **`code_and_math` (Default)**: Retains steps that contain code blocks (```` ` or inline `` `...` ``), math operators (`+`, `-`, `*`, `/`, `=`, `<=`), SQL keywords, or variable assignments (`const x =`, `let y =`). Removes all pure prose sentences. Use this mode for general coding and math tasks.
- **`balanced`**: Retains everything in `code_and_math`, and also retains prose steps that state formal specifications, big-O complexity (`O(n)`), preconditions, invariants, or file paths. Removes conversational filler. Use this mode for architecture and security reviews.
- **`strict`**: Retains **only** fenced code blocks (````...````) and explicit equations (`24 * 15 = 360`). Removes all prose text. Use this mode when you want the auditor to see zero natural language.

### 6.2 Migrating from 1.x

Version 2.0.0 renames the plugin and its configuration surface. The break is clean: 1.x names are not read as aliases.

| 1.x variable | 2.0.0 variable |
| :--- | :--- |
| `OPENCODE_AUDITOR_MODEL` | `OPENCODE_SUPERVISOR_MODEL` |
| `OPENCODE_AUDITOR_VARIANT` | `OPENCODE_SUPERVISOR_VARIANT` |
| `OPENCODE_AUDITOR_MAX_REGENERATIONS` | `OPENCODE_SUPERVISOR_MAX_REGENERATIONS` |
| `OPENCODE_AUDITOR_STRIP_MODE` | `OPENCODE_SUPERVISOR_STRIP_MODE` |
| `OPENCODE_AUDITOR_BLOCK_REWARD_HACKING` | `OPENCODE_SUPERVISOR_BLOCK_REWARD_HACKING` |
| `OPENCODE_AUDITOR_REQUIRE_STEP_REFERENCE_IN_TOOLS` | `OPENCODE_SUPERVISOR_REQUIRE_STEP_REFERENCE_IN_TOOLS` |
| `OPENCODE_AUDITOR_MEMO_MAX_SOLVED_ITEMS` | `OPENCODE_SUPERVISOR_MEMO_MAX_SOLVED_ITEMS` |
| `OPENCODE_AUDITOR_MEMO_MAX_CRITIQUES` | `OPENCODE_SUPERVISOR_MEMO_MAX_CRITIQUES` |
| `OPENCODE_AUDITOR_ENDPOINT` | *(removed in 1.0 — no equivalent; audits run through the side session)* |

Also renamed: the plugin id and session config key (`opencode-reasoning-audit` → `opencode-supervisor`) and the GitHub repository (old URLs redirect automatically).

---

## 7. Installation and Usage

### 7.1 Install and Test

```bash
# 1. Clone this repository and install dependencies
#    (the plugin entry imports @opencode-ai/plugin)
git clone https://github.com/jflowers/opencode-supervisor.git
cd opencode-supervisor
bun install

# 2. Run the unit tests (works with Bun or Node 22+)
bun test
# Or with Node:
node --test test/audit.test.ts test/memo.test.ts test/reminders.test.ts

# 3. Register the plugin with OpenCode (one of the options below)

# 4. Start OpenCode
opencode
```

### 7.2 Registering with OpenCode

Register the plugin through any of OpenCode's real mechanisms:

**Option A — project config `plugin` array** (this repository's own pattern). Add the entry to the `opencode.json` of the project OpenCode runs in. From inside this repository:

```json
{
  "plugin": [
    "./index.ts"
  ]
}
```

Relative specs resolve against the config file's directory. From a different project, use an absolute path to this repository's `index.ts`.

**Option B — the `opencode plugin` command**:

```bash
opencode plugin /absolute/path/to/opencode-supervisor
```

Registers the plugin in the current project's `.opencode/opencode.json` (`--global` for the global config). Pass an absolute path: a relative spec is written verbatim, then resolves against `.opencode/`, where it points nowhere and is silently dropped.

**Option C — auto-discovery**. OpenCode loads every `*.ts` / `*.js` file directly under a `plugin/` or `plugins/` directory in a config directory (for example `.opencode/plugins/`). For this repository's entry, use a symlink rather than a copy: the entry imports `./src/*`, and a copied file would lose those relative imports.

The entry imports `@opencode-ai/plugin`, so that dependency must be installed at the repository root — `bun install` after clone (declared in `package.json`).

### 7.3 Install as a Lightweight OpenCode Skill (Alternative)

If you do not want to run the TypeScript middleware, copy `skills/reasoning-auditor/skill.md` into your global OpenCode skills directory:

```bash
mkdir -p ~/.config/opencode/skills/reasoning-auditor
cp skills/reasoning-auditor/skill.md ~/.config/opencode/skills/reasoning-auditor/skill.md
```

The skill applies the same audit technique through prompt instructions. The middleware adds what a skill cannot do: automatic critique delivery (steer and interrupt), the tool guard, the supervisor memo, and the agent-console tools (`remind_me` / `forget_reminder`).

### 7.4 Agent Console: `remind_me` / `forget_reminder`

The plugin registers two tools with OpenCode (`Hooks.tool`), so the
primary agent can call them like any other tool. This is the agent
console's first slice: self-serve supervision state.

**`remind_me`** stores a durable fact for the rest of the session:

- Dead ends: "the flaky import always fails — do not retry it; use the
  direct path instead."
- Environment quirks: "this project needs bash 4.5 to run the test
  suite; otherwise there are errors."
- Decisions: "we chose the streaming parser over the DOM parser."
- User constraints: "never touch the generated/ directory."

A stored reminder re-enters context two ways: a `Reminders:` section in
the supervisor memo (re-injected every turn, so reminders survive
context compaction) and the tool result itself (which echoes the stored
text, so the reminder lands even when the gateway drops the memo —
see Section 9).

Each reminder gets a stable id (`r1`, `r2`, ...). Ids are never
recycled: forgetting `r1` and adding another reminder yields `r3`.

**`forget_reminder`** clears a reminder by id (`forget_reminder r1`).
An unknown id returns an actionable message listing the current ids.

Behavior details:

- Storage is bounded: the most recent `memoLimits.maxReminders`
  reminders are kept (default 10;
  `OPENCODE_SUPERVISOR_MEMO_MAX_REMINDERS`).
- Whitespace-only text is rejected with an actionable message; text
  longer than 2000 characters is truncated and the result says so.
- Supervisor side sessions (audit traffic) get inert results and never
  read or write reminder state.

---

## 8. Tested Versions

- OpenCode runtime: **1.19.0**
- `@opencode-ai/plugin`: **^1.19.4** (declared in `package.json`)

The memo uses the `experimental.chat.system.transform` hook. Experimental hooks are a moving target across OpenCode upgrades; if the hook is absent, the plugin loads and runs without the memo rather than failing.

---

## 9. Current Limitations

- The critique is delivered as a user-role message (synthetic-marked). The V1 OpenCode client exposes no delivery option; steer pickup is run-loop behavior verified against 1.19.0.
- Severe interrupts are bounded by `maxRegenerations` (default 2) per session: once the bound is spent, a severe finding neither interrupts nor delivers — it is recorded as withheld. The tool guard's reward-hacking block remains active independent of the bound.
- The supervisor memo is appended to the system prompt by the plugin, but tested model gateways (enmaas, OpenRouter) drop pushed secondary system messages — memo content may never reach the model depending on the gateway (evidence: the smoke test recorded in `openspec/changes/audit-supervisor/design.md`). Reminders carry a second channel: the `remind_me` tool result echoes the stored text into the conversation, so the reminder is seen even when the memo is not.
- Supervision state is in-process only. Restarting OpenCode clears the goal, the verified trace, and the logs.
- The verified-trace file-path check is best-effort: a tool call that races an in-flight audit sees the partial trace (an empty trace never blocks).
- A blocked tool surfaces to the model as an error tool result, so the model may retry the call (bounded by OpenCode's doom-loop check).

---

## 10. Roadmap: Two Consoles on the Supervision Plane

The audit loop above is the automated pillar; the agent console's first slice ships in 2.1.0. Both consoles write the same session-state layer rendered through the memo:

1. **Agent console (self-serve tools)**: first slice shipped — `remind_me` / `forget_reminder` for durable, compaction-proof reminders ("this project needs bash 4.5 for the test suite"; Section 7.4). Remaining: recall, report, and on-demand-audit tools on the same state layer.
2. **Engineer console (directives)**: predefined instruction files (`.opencode/supervisor/directives/*.md`) that meta-prompt engineers use to guide and oversee the agent — advisory text injected into the memo, with enforceable rules (forbidden paths, forbidden command patterns) wired into the tool guard.

---

## 11. Future Directions: Extending the Supervision Loop

Beyond the roadmap consoles, the supervision loop (observe → strip → audit → steer or interrupt) can supervise an agent for more than math and logic mistakes:

1. **Persist Lessons Learned**:
   - *Problem*: While debugging, the watched AI discovers useful facts about the codebase (for example, a tricky build command or a non-obvious API rule), but that knowledge disappears when the session ends. The memo carries solved items and critiques only within a session.
   - *Solution*: When the auditor observes a verified root-cause discovery in the reasoning trace, write that lesson to a persistent store (such as a knowledge base) without interrupting the AI, and recall it in later sessions.
2. **Tighter Scope Enforcement**:
   - *Problem*: An AI agent asked to fix a small bug begins refactoring unrelated modules. The audit prompt already receives the session goal and flags scope drift as a minor finding, but drift only steers.
   - *Solution*: Interrupt directly when the agent plans work far outside the stated goal.
3. **Just-in-Time Context Injection**:
   - *Problem*: Putting every team rule in the initial system prompt wastes tokens and dilutes attention.
   - *Solution*: When the verified trace mentions a database migration or another rule-heavy area, inject the matching team checklist into the memo at that exact moment.
4. **Streaming Observation**:
   - *Problem*: Auditing reasoning only after a part completes leaves a window where a flawed step drives tool calls before the audit lands (the tool guard's trace check is best-effort for the same reason).
   - *Solution*: Observe and interrupt mid-stream through the newer model-wrapping APIs. The pure `src/` boundary keeps that port cheap.
