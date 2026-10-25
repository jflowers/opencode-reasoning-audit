---
tag: rename-hygiene
author: jay-flowers
category: gotcha
created_at: 2026-10-25T18:59:36Z
identity: rename-hygiene-20261025T185936-jay-flowers
tier: draft
---

In a project-rename change, the lockfile is a live carrier of the old package identity: bun.lock's workspaces[""].name (and package-lock.json's name fields) mirror package.json and are rewritten only by re-running the package manager's install — editing package.json alone leaves the lockfile naming the dead package. A rename whose acceptance gate is a "zero live old-name matches" grep must include lockfiles in the scanned scope, and any task claiming "install leaves the lockfile consistent" must be executed after the rename edit, not before. Observed in the opencode-reasoning-audit → opencode-supervisor rebrand (opsx/rebrand-supervisor): bun.lock line 6 kept "opencode-reasoning-audit" while the grep-gate and lockfile-consistency tasks were both marked complete.
