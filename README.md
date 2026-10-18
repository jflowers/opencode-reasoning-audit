# opencode-reasoning-audit

Process supervision, Chain-of-Thought (CoT) narrative stripping, tool intent verification, and automated self-correction challenge loops for **OpenCode**.

## Features

1. **Process Supervision & Narrative Stripping (`src/stripper.ts`)**: Filters persuasive conversational filler from `message.reasoning_steps` and isolates raw code blocks, mathematical equations, and formal invariants.
2. **Multi-Agent Peer Audit (`src/auditor.ts`)**: Evaluates each isolated reasoning step for arithmetic discrepancies, off-by-one boundary defects, security violations, and reward hacking.
3. **Challenge & Self-Correction Loop (`index.ts`)**:
   - Marks audited messages (`message.is_audited = true`) to prevent infinite loops.
   - Calls `await session.injectMessage(...)` with the auditor's structured critique.
   - Calls `await session.regenerate()` to force the primary model to revise its reasoning and output.
4. **Tool Execution Guard (`src/tool-guard.ts`)**: Hooks into `onToolExecute` to block unverified file mutations, hallucinated parameters, and reward-hacking flags (`--no-verify`, `.skip()`).
5. **Lightweight OpenCode Skill (`skills/reasoning-auditor/skill.md`)**: Drop-in prompt hierarchy supervision for `~/.opencode/skills/reasoning-auditor/skill.md`.

## Quick Start (Bun + OpenCode)

```bash
# 1. Clone your repository
git clone https://github.com/<your-username>/opencode-reasoning-audit.git
cd opencode-reasoning-audit

# 2. Run unit tests
bun test

# 3. Register local plugin in OpenCode
bunx oh-my-opencode install --local .
```

## Alternative: Install as a Global OpenCode Skill

```bash
mkdir -p ~/.opencode/skills/reasoning-auditor
cp skills/reasoning-auditor/skill.md ~/.opencode/skills/reasoning-auditor/skill.md
```
