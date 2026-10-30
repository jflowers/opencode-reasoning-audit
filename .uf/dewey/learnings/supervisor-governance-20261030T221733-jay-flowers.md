---
tag: supervisor-governance
author: jay-flowers
category: pattern
created_at: 2026-10-30T22:17:33Z
identity: supervisor-governance-20261030T221733-jay-flowers
tier: draft
---

When a supervision or governance plugin introduces project-writable configuration files, the new files inherit the project directory's trust problem: the supervised agent can edit its own supervisor's tuning (guard toggles, auditor model) and defang it across restarts. The opencode-supervisor 2.5.0 change (openspec/changes/fix-supervisor-logging, FR-061) established the closing pattern: extend the existing engineer-authored-state guard (the approvals.json precedent) to the new config files and the directives directory; pair a lexically normalized path-token lens (traversal collapses, leading dots fold) with a raw bash command-string scan so traversal, slash-free cd, and glob spellings cannot evade matching; exclude only write/edit content keys (content is data, never an operation) so coverage stays fail-closed for unknown and custom argument keys; and report guard toggles plus contributing config tiers in the identity log line so a flipped knob is visible in the server log.
