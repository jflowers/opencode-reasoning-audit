---
tag: documentation
author: jay-flowers
category: gotcha
created_at: 2026-10-23T16:49:39Z
identity: documentation-20261023T164939-jay-flowers
tier: draft
---

Limitations discovered by late workflow steps (live smoke tests) do not propagate themselves into documentation written by earlier steps. In opsx/audit-supervisor, task 4.2 wrote the README's Current Limitations before task 4.3's live smoke test discovered gateway-dropped memo delivery (FR-016) and an unbounded severe-abort loop; both observed limitations stayed out of the README while the features were documented as working. When a verification step surfaces user-facing limitations, add an explicit docs-update pass (or re-open the docs task) before marking the change complete — otherwise the orientation docs overstate observed behavior at merge time.
