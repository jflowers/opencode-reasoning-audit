---
tag: configuration
author: jay-flowers
category: gotcha
created_at: 2026-10-26T00:05:41Z
identity: configuration-20261026T000541-jay-flowers
tier: draft
---

When a config precedence chain deliberately treats 0 as a meaningful value (using ?? rather than || so 0 does not fall through to defaults), every consumer of that cap must handle cap=0 coherently end-to-end. In opencode-supervisor, OPENCODE_SUPERVISOR_MEMO_MAX_REPORTS=0 is a documented-valid setting that makes addReport store nothing, yet the report tool still returned "recorded ... It appears in the supervisor memo for the engineer" — a false delivery confirmation on the channel that surfaces agent blockers. Test the zero value of every new numeric knob through to its user-facing confirmation message, not just the storage path.
