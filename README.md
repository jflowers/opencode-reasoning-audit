# opencode-reasoning-audit

An OpenCode middleware plugin that audits, interrupts, and repairs AI reasoning steps before the AI completes its action.

*(This document uses ASD-STE100 Simplified Technical English for clear, unambiguous instructions.)*

---

## 1. Overview of the Technique

When a primary AI model solves a problem, it produces a Chain-of-Thought (CoT) and tool calls. Standard AI workflows only check the final output. If Step 2 of a 10-step plan contains a logic error, the AI builds Steps 3 through 10 on a false assumption.

This plugin implements **Process Supervision** and **Automated Self-Correction** inside OpenCode. The plugin hooks into two OpenCode lifecycle events (`onMessageUpdated` and `onToolExecute`) and runs a four-step loop:

1. **Intercept the Reasoning Steps**: When the watched AI updates its message, the plugin reads `message.reasoning_steps` before the session accepts the final answer.
2. **Strip the Narrative Text (`stripNarrative`)**: Persuasive conversational text (for example, *"Obviously, this formula is optimal"*) often hides math and logic errors. The plugin removes conversational text and keeps only formal steps (code blocks, equations, and explicit rules).
3. **Audit the Formal Steps (`runPeerAudit` & `verifyToolIntent`)**: An independent auditor model checks each stripped step in sequence. Before any tool runs, the plugin also checks that the tool arguments match the verified steps.
4. **Interrupt and Repair (`session.injectMessage` & `session.regenerate`)**: If a step fails the audit, the plugin sets `message.is_audited = true` to prevent an infinite loop. Then the plugin injects the auditor critique into the active session and triggers `session.regenerate()`. The watched AI reads the critique and repairs its own reasoning.

---

## 2. Origin of the Technique

This plugin is based on the multi-agent reasoning audit and repair framework described in:

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
3. **Stop Reward Hacking**: When a coding agent cannot fix a failing test, it sometimes tries to cheat ("reward hack"). For example, the agent may add `.skip()` to a test, delete an `assert` statement, or run `git commit --no-verify`. The `onToolExecute` hook blocks these actions immediately.
4. **Block Hallucinated File Paths**: Ensure that the coding agent cannot modify or delete a file unless the verified reasoning steps explicitly name that file.

---

## 5. How to Configure and Use This Plugin

### 5.1 Configuration Parameters Explained

| Parameter | Type | Default Value | Description |
| :--- | :--- | :--- | :--- |
| **`auditorModel`** | `string` | 'google/gemini-3.8-flash' | The provider and model slug that performs the peer audit. Format: `<provider>/<model-id>` (for example, `openai/o3-mini`, `anthropic/claude-3-7-sonnet`, or `google/gemini-3.8-flash`). |
| **`auditorVariant`** | `string` | 'low' | The reasoning effort level sent to the auditor model. Allowed values: `minimal`, `low`, `medium`, `high`, `default`. |
| **`stripMode`** | `string` | 'code_and_math' | Controls how `stripNarrative()` filters the Chain-of-Thought before the audit. See Section 5.2 below for details. |
| **`injectRole`** | 'user' \| 'system' | 'user' | The message role used when `session.injectMessage()` sends a critique to the watched AI. |
| **`maxRegenerations`** | `number` | 2 | The maximum number of times the plugin calls `session.regenerate()` for one turn. Prevents infinite retry loops. |
| **`blockRewardHacking`** | `boolean` | true | When `true`, blocks tool calls that contain `--no-verify`, `.skip(`, `expect(true).toBe(true)`, or test deletion commands. |
| **`requireStepReferenceInTools`** | `boolean` | true | When `true`, blocks `onToolExecute` if a tool argument references a file path that does not appear in the verified reasoning steps. |

### 5.2 Understanding `stripMode`

The `stripMode` setting controls how much text `stripNarrative()` removes from `message.reasoning_steps`:

- **`code_and_math` (Default)**: Retains steps that contain code blocks (```` ` or inline `` `...` ``), math operators (`+`, `-`, `*`, `/`, `=`, `<=`), SQL keywords, or variable assignments (`const x =`, `let y =`). Removes all pure prose sentences. Use this mode for general coding and math tasks.
- **`balanced`**: Retains everything in `code_and_math`, and also retains prose steps that state formal specifications, big-O complexity (`O(n)`), preconditions, invariants, or file paths. Removes conversational filler. Use this mode for architecture and security reviews.
- **`strict`**: Retains **only** fenced code blocks (````...````) and explicit equations (`24 * 15 = 360`). Removes all prose text. Use this mode when you want the auditor to see zero natural language.

### 5.3 Three Ways to Set Configuration (In Order of Precedence)

#### Method A: In `opencode.json` (Project or Global Config)

Add a `plugins["opencode-reasoning-audit"]` section to your project `opencode.json` or `~/.config/opencode/opencode.json`:

```json
{
  "plugins": {
    "opencode-reasoning-audit": {
      "auditorModel": "google/gemini-3.8-flash",
      "auditorVariant": "low",
      "stripMode": "code_and_math",
      "injectRole": "user",
      "maxRegenerations": 2,
      "blockRewardHacking": true,
      "requireStepReferenceInTools": true
    }
  }
}
```

#### Method B: With Environment Variables

Set environment variables in your terminal before you start OpenCode:

```bash
export OPENCODE_AUDITOR_MODEL="google/gemini-3.8-flash"
export OPENCODE_AUDITOR_VARIANT="low"
# Optional external HTTP auditor endpoint:
export OPENCODE_AUDITOR_ENDPOINT="http://localhost:3000/api/audit/run"
```

#### Method C: In `index.ts` (`pluginConfig`)

Edit the `pluginConfig` object at the top of `index.ts`.

### 5.4 Installation and Usage

#### Install as an OpenCode Plugin (Recommended)

```bash
# 1. Clone this repository
git clone https://github.com/<your-username>/opencode-reasoning-audit.git
cd opencode-reasoning-audit

# 2. Run the unit tests (works with Bun or Node 22+)
bun test
# Or with Node:
node --test test/audit.test.ts

# 3. Register the plugin with OpenCode
bunx oh-my-opencode install --local .

# 4. Start OpenCode
opencode
```

#### Install as a Lightweight OpenCode Skill (Alternative)

If you do not want to run the TypeScript middleware, copy `skills/reasoning-auditor/skill.md` into your global OpenCode skills directory:

```bash
mkdir -p ~/.opencode/skills/reasoning-auditor
cp skills/reasoning-auditor/skill.md ~/.opencode/skills/reasoning-auditor/skill.md
```

---

## 6. Future Directions: Interrupting and Observing the Watched AI

The middleware pattern in this repository (`onMessageUpdated` -> inspect steps -> `session.injectMessage()` -> `session.regenerate()`) can do much more than fix math or logic mistakes. You can use this architecture to **observe, interrupt, or guide a watched AI agent for any purpose**:

1. **Recover from Context Compaction (Remind the AI What It Already Solved)**:
   - *Problem*: Long coding sessions trigger context compaction. After compaction, the watched AI often forgets that it already solved problem $X$ earlier in the session and starts solving $X$ a second time.
   - *Solution*: The plugin records a summary of completed sub-problems in memory. When `onMessageUpdated` sees the watched AI start work on $X$ again, the plugin interrupts the AI and injects a reminder: *"You already solved X in commit/file Y. Reuse that solution instead of rewriting it."*
2. **Capture and Store Lessons Learned**:
   - *Problem*: While debugging, the watched AI discovers useful facts about the codebase (for example, a tricky build command or a non-obvious API rule), but that knowledge disappears when the session ends.
   - *Solution*: When the auditor observes a verified root-cause discovery in the reasoning trace, the plugin writes that lesson to a persistent file (such as `.opencode/lessons.md` or a vector store) without interrupting the AI.
3. **Enforce Project Architecture and Scope Guardrails**:
   - *Problem*: An AI agent asked to fix a small bug begins refactoring unrelated modules.
   - *Solution*: The plugin compares the files in `reasoning_steps` against the user prompt. If the AI plans to touch out-of-scope modules, the plugin interrupts the AI and instructs it to stay within the target module.
4. **Just-in-Time Context Injection**:
   - *Problem*: Putting every team rule in the initial system prompt wastes tokens and dilutes attention.
   - *Solution*: When the plugin sees the watched AI mention a database migration in `reasoning_steps`, it injects the team's database migration checklist into the session at that exact moment.
