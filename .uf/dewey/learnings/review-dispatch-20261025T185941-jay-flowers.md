---
tag: review-dispatch
author: jay-flowers
category: pattern
created_at: 2026-10-25T18:59:41Z
identity: review-dispatch-20261025T185941-jay-flowers
tier: draft
---

When a change's task list marks a file-modification task [x] but the file is absent from the diff, read the file before trusting the checkbox. In opsx/rebrand-supervisor, task 2.5 ('Update skills/reasoning-auditor/skill.md cross-references') is checked complete and proposal.md lists the skill under 'Changed', but the file was never touched — a direct read showed it contains no middleware/repo references to update, so the task was a vacuous no-op recorded as a performed update, leaving spec artifacts describing a change surface that does not exist. Pattern: diff the set of files a task list claims to modify against the actual changed-file list; for each claimed-but-unchanged file, verify whether the task was a genuine no-op and correct the artifact to record that, rather than leaving a checked task implying a nonexistent diff.
