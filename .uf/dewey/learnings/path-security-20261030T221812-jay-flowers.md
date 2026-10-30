---
tag: path-security
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:18:12Z
identity: path-security-20261030T221812-jay-flowers
tier: draft
---

A path-protection guard that blocks only argument paths inside or equal to protected targets is bypassed by operations on ancestor directories: `rm -rf .opencode/supervisor` deletes the directives, config, and approvals state while matching no containment lens, because the normalized path is a prefix of — not contained in — every protected target, and the raw-substring lens finds 'supervisor' but no protected basename. Observed in opencode-supervisor's FR-061 round-2 hardening (opsx/fix-supervisor-logging): the two-lens pairing closed slash-free and traversal spellings but left the perimeter hole exactly one directory level up. Fix pattern: block when the argument path contains the protected directory's segment run at all (ancestor-prefix semantics, not containment), which collapses all protected children into one rule; and pair raw-substring lenses with call-spanning state (tracked CWD per session) or a bare-`cd` block, since a stateless per-call lens falls to `cd .opencode/supervisor` followed by a separate `cat config.json`. This is the path-matching anchoring lesson (learning/path-matching-20261025T213038) recurring one level up: containment anchoring, like root anchoring, silently misses an entire spelling class.
