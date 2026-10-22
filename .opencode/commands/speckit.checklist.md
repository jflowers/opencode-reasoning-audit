---
description: Generate a custom checklist for the current feature based on user requirements.
---

<!-- scaffolded by uf vdev -->

# Command: /speckit.checklist

Generate a requirements-quality checklist for the current
feature — "unit tests for English". The checklist tests
REQUIREMENTS quality, not implementation behavior.

<protect>

## Outline

- Initialize and resolve the feature directory
- Ask up to 3 clarifying questions about quality concerns
- Generate the checklist file in `FEATURE_DIR/checklists/`
- Report item counts per quality dimension

**STOP HERE. Do NOT proceed to implementation.**

Your job is done. Report the results and prompt the
user. The user will invoke a separate command
(`/speckit.implement`, `/uf.unleash`, or `/uf.cobalt-crush`)
when they are ready to implement.

## Instructions

1. **Initialize**

   Run from the repo root:

   ```bash
   .specify/scripts/bash/check-prerequisites.sh --json
   ```

   Parse the JSON output for `FEATURE_DIR`. If the script
   fails, stop and report the error.

2. **Clarify**

   Ask the user up to 3 clarifying questions about their
   quality concerns BEFORE generating (e.g., domain focus,
   risk areas, compliance needs). If the user provides no
   preferences, proceed with sensible defaults.

3. **Generate the checklist**

   - Create `FEATURE_DIR/checklists/<domain>.md` where
     `<domain>` reflects the checklist's focus (e.g.,
     `security`, `api`, `ux`, `data-model`).
   - Each run creates a NEW checklist file. NEVER overwrite
     an existing checklist — if the name collides, suffix
     the filename (e.g., `security-2.md`).
   - Base items on the feature's spec.md and plan.md
     requirements.
   - Items use the question format:

     `Are [X] defined for [Y]?`

   - Each item includes one quality dimension tag:
     `[Completeness]`, `[Clarity]`, `[Consistency]`,
     `[Measurability]`, or `[Coverage]`.

4. **Report**

   Display the checklist path and a summary of item counts
   per quality dimension. Prompt the user to review it
   before proceeding.

</protect>

## Guardrails

- **NEVER modify source code** — this command updates
  spec artifacts ONLY. Implementation changes belong in
  `/speckit.implement`, `/uf.unleash`, or `/uf.cobalt-crush`.
- **NEVER modify test files, Go source, Markdown agents,
  convention packs, or config files** outside the
  `specs/NNN-*/` feature directory.
- The ONLY files this command may write are:
  - `FEATURE_SPEC` (the spec.md file)
  - Files within `FEATURE_DIR` (spec artifacts:
    plan.md, tasks.md, research.md, data-model.md,
    quickstart.md, contracts/, checklists/)
- The user needs to review the plan before
  implementation begins. Implementing without review
  defeats the purpose of the spec-first workflow.
- Consult the project constitution
  (`.specify/memory/constitution.md`) and retrieve prior
  context via Dewey (`dewey_semantic_search`) before
  writing spec artifacts.
