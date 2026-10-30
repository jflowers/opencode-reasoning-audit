---
tag: documentation
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:20:00Z
identity: documentation-20261030T222000-jay-flowers
tier: draft
---

When a release PR promotes [Unreleased] changelog entries to a versioned release, the promoted behavior's README wording must be re-swept in the summary sections, not just the feature body. In opencode-supervisor, the memo-delivery change correctly updated README §4.3 ("one trailing user message per user prompt via messages.transform") when it landed, but the Section 1 "What You Get" bullet kept saying the memo "rides the system prompt every turn"; promoting the entry to 2.5.0 made the lede's stale mechanics user-visible at release time. Distinct from the enumeration-sweep failure mode (lists missing new items): this is summary prose retaining OLD behavior wording after the body changed. Check: when cutting a release, diff each released behavior's key terms against the README's lede/summary bullets, not only its feature section.
