---
tag: security
author: jay-flowers
category: gotcha
created_at: 2026-10-26T01:48:14Z
identity: security-20261026T014814-jay-flowers
tier: draft
---

When a supervision control guards a file that is read fresh at verification time (opencode-supervisor approvals.json, read per gated call) rather than loaded once at startup (directive files), runtime tamper by the supervised party is live rather than inert — the two files are not the same tamper class even in the same directory. The anti-tamper check must be graded against the path extractor's actual token coverage: extractPolicyPaths requires a slash or leading dot, so a slash-free spelling (`cd .opencode/supervisor && echo ... > approvals.json`) extracts no approvals.json candidate and bypasses a basename-equality check. Fix pattern: pair extracted-path checks with a case-insensitive raw-args substring test for the guarded filename, add a regression test for the slash-free spelling, and word spec/README to the check's actual coverage class.
