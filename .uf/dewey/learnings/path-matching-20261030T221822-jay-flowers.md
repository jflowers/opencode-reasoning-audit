---
tag: path-matching
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:18:22Z
identity: path-matching-20261030T221822-jay-flowers
tier: draft
---

Dotfile directory segments defeat segment-run path matching: normalizePathToken folds only exact '.', '..', and empty segments, so '.opencode/supervisor/config.json' keeps its '.opencode' first segment and never matches a needle of 'opencode/supervisor/config.json'. When matching protected paths by normalized segment runs, derive the needle from the actual on-disk spelling (including leading dots), or match both spellings — otherwise the lens silently protects only the non-dotfile variant (the XDG global path) while the project path relies entirely on a second, broader lens.
