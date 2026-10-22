---
description: Convert existing tasks into actionable, dependency-ordered GitHub issues for the feature based on available design artifacts.
tools: ['github/github-mcp-server/issue_write']
---

<!-- scaffolded by uf vdev -->

# Command: /speckit.taskstoissues

Convert tasks.md entries into dependency-ordered GitHub
issues for the feature via the GitHub MCP server.

<protect>

## Outline

- Initialize and resolve the feature directory
- Validate the GitHub remote URL
- Load and parse tasks.md
- Create one issue per task in dependency order
- Report the task-to-issue mapping

## Instructions

1. **Initialize**

   Run from the repo root:

   ```bash
   .specify/scripts/bash/check-prerequisites.sh --json
   ```

   Parse the JSON output for `FEATURE_DIR`. If the script
   fails, stop and report the error.

2. **Validate the GitHub remote**

   Run `git remote -v` and confirm a GitHub remote URL
   exists (HTTPS or SSH). If no GitHub remote is found,
   **STOP** with an error — issue creation requires a
   GitHub repository.

3. **Load tasks**

   Read `FEATURE_DIR/tasks.md`. Parse each task's ID,
   description, phase, and dependencies.

4. **Create issues in dependency order**

   Use the GitHub MCP server (`issue_write` tools) to
   create one issue per task, ordered so that blockers are
   created before the tasks that depend on them:

   - Issue titles carry the task ID and summary.
   - Issue bodies summarize the task and reference the
     spec section it implements.
   - Dependent issues include `Depends on #N` references
     once the blocking issue's number is known.
   - NEVER create issues in a repository that does not
     match the current Git remote URL.

5. **Report**

   Display the task-to-issue mapping (task ID → issue
   number/URL) and prompt the user to review the created
   issues.

</protect>

## Guardrails

- This command creates **GitHub issues via** the MCP API.
  It does NOT write local files.
- Issues MUST only be created in the repository matching
  the current Git remote. NEVER create issues in
  unrelated repositories.
- **Content portability**: Issue titles and bodies MUST
  use language appropriate to the target repository's
  language and project type. Read README.md or AGENTS.md
  to determine the project type. MUST NOT reference
  tools or concepts specific to a different repository
  type (e.g., "organization-configuration repository",
  "Peribolos", "safe-settings") unless the target
  repository actually uses them. See convention pack
  rules CP-001 through CP-003.
- Do NOT modify source code, spec artifacts, or any
  local files.
