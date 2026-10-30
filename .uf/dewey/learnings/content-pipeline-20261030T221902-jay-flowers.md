---
tag: content-pipeline
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:19:02Z
identity: content-pipeline-20261030T221902-jay-flowers
tier: draft
---

A change's tasks.md follow-up bullet naming in-repo docs/blog/tutorial issues does not prove the constitution's cross-repo website gate is satisfied. In jflowers/opencode-supervisor, every release 2.0–2.4 filed a paired "Update opencode-supervisor capabilities" issue in unbound-force/website (#326–#331), but the 2.5.0 change tracked only in-repo #30/#31/#4 in its tasks.md, and the website issue was missing until review caught it. Check: list the website repo's issue series for the project (gh issue list --repo unbound-force/website --state all --search "<project>") and confirm the current release has an entry — not just that the in-repo labels are present.
