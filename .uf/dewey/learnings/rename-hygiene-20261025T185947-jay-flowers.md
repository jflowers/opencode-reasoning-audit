---
tag: rename-hygiene
author: jay-flowers
category: gotcha
created_at: 2026-10-25T18:59:47Z
identity: rename-hygiene-20261025T185947-jay-flowers
tier: draft
---

Bun's lockfile (bun.lock) embeds the root package name in its workspaces section; renaming a package in package.json without re-running `bun install` leaves the committed lockfile carrying the old identity, and rename grep gates scoped to source and docs miss it because lockfiles read as generated artifacts. Found in the opencode-reasoning-audit → opencode-supervisor rebrand (opsx/rebrand-supervisor): bun.lock:6 still said "opencode-reasoning-audit" while package.json said "opencode-supervisor", falsifying both the "bun install leaves lockfile consistent" verification and the zero-old-name grep gate. After any package identity rename: run the install command once, commit the regenerated lockfile, and include lockfiles in the old-name grep sweep.
