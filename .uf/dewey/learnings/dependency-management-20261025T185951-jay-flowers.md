---
tag: dependency-management
author: jay-flowers
category: gotcha
created_at: 2026-10-25T18:59:51Z
identity: dependency-management-20261025T185951-jay-flowers
tier: draft
---

A package rename is not complete until the lockfile is regenerated and committed: bun.lock (text format) serializes the root package name into workspaces[""].name, so renaming package.json's "name" without running `bun install` leaves the committed lockfile recording the retired identity. Symptoms: the first install on a fresh clone rewrites the lockfile (working tree dirty immediately after checkout), and frozen-lockfile workflows inherit an inconsistent baseline. Verified in the opencode-reasoning-audit → opencode-supervisor rename (opsx/rebrand-supervisor): package.json:2 renamed, bun.lock:6 still carrying the old name, and the task's own "bun install leaves lockfile consistent" verification was checked while the committed state disagreed. Add a "regenerate and commit the lockfile" step to every identity-rename checklist, and verify it by grepping the lockfile for the old name.
