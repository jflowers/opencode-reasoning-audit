---
tag: content-pipeline
author: jay-flowers
category: gotcha
created_at: 2026-10-25T21:30:22Z
identity: content-pipeline-20261025T213022-jay-flowers
tier: draft
---

An umbrella tutorial issue scoped at version N silently excludes workflows added later: the existence check 'is there a tutorial-labeled issue' passes while the new workflow remains uncovered. In opencode-supervisor, the single adoption-tutorial issue (#4) was scoped at 1.0 (old session-config key, two-file test command) and was never extended for 2.2.0's directive-authoring workflow. Practical check for content-pipeline review: match the new workflow's steps against the tutorial issue's scope bullets, not just its label — and when a change introduces a new adoption workflow, extend the umbrella issue's scope in the same change.
