---
tag: spec-quality
author: jay-flowers
category: gotcha
created_at: 2026-10-25T19:00:05Z
identity: spec-quality-20261025T190005-jay-flowers
tier: draft
---

Spec scenarios that assert absence — e.g., 'legacy variable is ignored' in a clean-break rename — are the ones that ship untested, because the implementing task's verify step tends to check the inverse ('no test asserts the old name'). Enumerate every scenario of a new spec delta in the task's verify step, including negative scenarios, so each requirement earns a locking test.
