---
tag: security
author: jay-flowers
category: pattern
created_at: 2026-10-25T21:30:17Z
identity: security-20261025T213017-jay-flowers
tier: draft
---

A blocking path matcher must normalize case to match the filesystem it protects — or it discloses its own bypass to the adversary. opencode-supervisor renders each directive (including its forbidPath glob) into the agent-visible memo every turn, then matches paths case-sensitively while macOS/Windows resolve them case-insensitively: an agent that reads `secrets/**` in its memo evades it by writing `Secrets/`. When the guarded party can read the rule, exact-string matching becomes a disclosed evasion surface; normalize case on both sides (the sibling trace check already lowercases both) or document the case contract explicitly.
