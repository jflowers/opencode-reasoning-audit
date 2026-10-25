---
tag: regex
author: jay-flowers
category: gotcha
created_at: 2026-10-25T21:30:14Z
identity: regex-20261025T213014-jay-flowers
tier: draft
---

Hand-rolled glob-to-regex compilers create ReDoS when `**/` maps to `(?:.*/)?`: the inner `.*` spans slashes, so repeated optional groups can partition a long path combinatorially and backtracking explodes (path segments choose group count). Compile `**/` to `(?:[^/]*/)*` instead — each iteration must end at a slash, so segment boundaries are forced and matching stays linear. This matters most where the compiled regex runs synchronously per call against adversary-influenced strings, such as tool guards that must never stall (fail-open FR: no hook path may stall the session).
