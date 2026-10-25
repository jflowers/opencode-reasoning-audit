---
tag: documentation
author: jay-flowers
category: gotcha
created_at: 2026-10-25T19:00:03Z
identity: documentation-20261025T190003-jay-flowers
tier: draft
---

Aspiration qualifiers silently drop out of short metadata fields during identity rewrites. In opencode-supervisor 2.0.0, README.md carefully framed the agent console and engineer console as roadmap ("Two more surfaces are planned"), but the package.json description compressed the same capability list to one line — "...tool guard, and consoles for agent self-serve tools and engineer directives" — listing the unbuilt consoles alongside three shipped features with no qualifier, and the keyword list added `agent-tools`. VB-004/FA-001 prohibit presenting aspirational capabilities as current. Gotcha: when one change rewrites both narrative docs and compressed metadata (package.json description, keywords, manifest summaries), verify every aspirational qualifier survives the compression — check the metadata fields explicitly, not just the README.
