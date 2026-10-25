---
tag: parsing
author: jay-flowers
category: gotcha
created_at: 2026-10-25T21:30:16Z
identity: parsing-20261025T213016-jay-flowers
tier: draft
---

Fence/marker regexes that require a literal \n after the tag silently miss CRLF files, and git's autocrlf=true on Windows converts checked-out config files to CRLF by default. opencode-supervisor's FENCE_PATTERN (/```supervisor\n...) never matches a CRLF-authored directive file, so its enforce rules vanish with no warning and the raw JSON fence rides the advisory text into the memo. Any line-anchored file-format pattern should use \r?\n, and a rules block that fails to appear should emit a warning rather than degrade silently.
