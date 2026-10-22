---
description: Identify underspecified areas in the current feature spec by asking up to 5 highly targeted clarification questions and encoding answers back into the spec.
---

<!-- scaffolded by uf vdev -->

# Command: /speckit.clarify

Detect and resolve ambiguities in the current feature's
spec.md by asking up to 5 highly targeted questions and
encoding the answers back into the spec.

<protect>

## Outline

- Initialize and resolve the feature directory
- Scan spec.md for ambiguities across 10 taxonomy categories
- Ask up to 5 targeted questions, one at a time
- Integrate answers into spec.md
- Record Q&A in a `## Clarifications` section

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

   Parse the JSON output for `FEATURE_DIR`. Read
   `FEATURE_DIR/spec.md`. If the script fails, stop and
   report the error.

2. **Scan for ambiguities**

   Scan spec.md for ambiguities across these 10 taxonomy
   categories:

   1. Functional scope
   2. Data model
   3. UX flow
   4. Non-functional requirements
   5. Integration
   6. Edge cases
   7. Constraints
   8. Terminology
   9. Completion signals
   10. Placeholders

3. **Ask up to 5 targeted questions**

   Ask questions ONE at a time. Each question:

   - Names its taxonomy category
   - Quotes the ambiguous spec text
   - Provides a recommended answer with reasoning

   Stop early if no further material ambiguities remain.

4. **Integrate answers**

   Rewrite the ambiguous text in place within the relevant
   spec.md sections using the user's answer. Keep the
   surrounding structure intact.

5. **Record Q&A**

   Append a `## Clarifications` section to spec.md (create
   it if absent) and record each exchange in the form:

   `- Q: <question> -> A: <answer>`

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
