---
tag: openspec
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:20:01Z
identity: openspec-20261030T222001-jay-flowers
tier: draft
---

In OpenSpec changes, when a review round appends a new FR number to an existing spec delta (e.g., FR-061 added to a delta described everywhere as FR-056..FR-060), the earlier-written artifacts go stale silently: tasks.md keeps the old FR range in its section descriptions, gains no task entry for the new requirement, and the proposal's Impact list omits the newly touched files — even though the implementation, tests, and user-facing docs all ship correctly. The review only catches it by diffing the delta's actual FR set against every artifact that names an FR range. Back-propagate at the moment the requirement is added to the delta: update FR ranges in tasks.md descriptions, add a task entry for the new work, and extend the proposal's Impact list.
