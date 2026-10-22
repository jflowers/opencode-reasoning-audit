---
description: Perform a non-destructive cross-artifact consistency and quality analysis across spec.md, plan.md, and tasks.md after task generation.
---

<!-- scaffolded by uf vdev -->

# Command: /speckit.analyze

Perform a read-only cross-artifact consistency and quality
analysis across spec.md, plan.md, and tasks.md after
`/speckit.tasks` produces tasks.md.

<protect>

## Outline

- Initialize and resolve the feature directory
- Load spec, plan, tasks, and constitution artifacts
- Run six detection passes (duplication, ambiguity,
  underspecification, constitution alignment, coverage gaps,
  inconsistency)
- Assign severity and render the analysis report
- Offer optional remediation suggestions

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

   Parse the JSON output for `FEATURE_DIR`. All artifacts are
   resolved relative to this directory. If the script fails,
   stop and report the error.

2. **Load artifacts**

   Read the following files. Skip any that do not exist and
   record the gap in the report:

   - `FEATURE_DIR/spec.md`
   - `FEATURE_DIR/plan.md`
   - `FEATURE_DIR/tasks.md`
   - `.specify/memory/constitution.md`

3. **Run detection passes**

   Perform six passes over the loaded artifacts:

   - **Duplication** — requirements, plan sections, or tasks
     that restate the same behavior
   - **Ambiguity** — language permitting multiple
     interpretations (vague quantifiers, undefined terms,
     unbound pronouns)
   - **Underspecification** — requirements without acceptance
     criteria; tasks without verification steps
   - **Constitution alignment** — artifacts that conflict with
     the project constitution's principles
   - **Coverage gaps** — requirements with no implementing
     task; tasks with no corresponding requirement
   - **Inconsistency** — contradictions between spec.md,
     plan.md, and tasks.md (names, behaviors, sequencing)

4. **Assign severity**

   For each finding assign one of: CRITICAL, HIGH, MEDIUM,
   LOW.

5. **Render the analysis report**

   Display a Markdown report (do NOT write any files):

   ```markdown
   ## Analysis Report: <feature-dir>

   ### Findings

   | Severity | Artifact | Finding | Suggestion |
   |----------|----------|---------|------------|

   ### Summary
   CRITICAL: N | HIGH: N | MEDIUM: N | LOW: N
   ```

6. **Offer optional remediation**

   For each CRITICAL and HIGH finding, offer a concrete
   remediation suggestion. Do not apply any fix — this
   command is read-only. The user decides what to change.

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
