---
tag: security
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:19:54Z
identity: security-20261030T221954-jay-flowers
tier: draft
---

Lexical path guards that normalize case, dots, and traversal but compare segments for exact equality remain bypassable by shell glob spellings: when the path extractor's character class excludes glob metacharacters (e.g. [A-Za-z0-9_.-]), a token like `.opencode/su*ervisor/app*vals.json` fragments at the `*` so no needle matches, and a paired raw-substring lens misses it because the literal words are gone — yet bash expands the glob onto the protected path. In opencode-supervisor this reopened gate self-approval and supervisor-config defanging that FR-044/FR-061 exist to prevent, and it also defeated the optional forbidPath defense-in-depth rule because directive globs consume the same fragmented extractor output. Fix pattern: make protected-segment matching wildcard-aware (treat `*`/`?`/`[` in a segment as pattern characters matched against the needle) or conservatively block glob-bearing tokens whose expansion could reach a protected run; add regression tests for `su*ervisor`, `[s]upervisor`, and `app*vals.json` spellings in both bash and non-bash tools. Generalizes the prior slash-free-spelling learning (security-20261026T014814-jay-flowers): every lexical-matching hardening invites the next spelling class — enumerate shell expansion (glob metacharacters, variable indirection, quoting) as a first-class evasion axis when specifying path guards.
