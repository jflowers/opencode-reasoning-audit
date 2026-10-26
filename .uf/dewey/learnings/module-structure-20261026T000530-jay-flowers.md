---
tag: module-structure
author: jay-flowers
category: gotcha
created_at: 2026-10-26T00:05:30Z
identity: module-structure-20261026T000530-jay-flowers
tier: draft
---

In opencode-supervisor, the agent-console slice pattern (slice module owns its memo-section renderer; memo.ts composes it) creates a static module cycle as soon as the slice also needs memo-domain types: the supervisor-tools change made memo.ts import renderReports from src/console.ts (value import) while src/console.ts imports CritiqueRecord/SolvedItem from src/memo.ts (type-only). Type-only edges are runtime-safe under Bun/Node type stripping but still violate the TypeScript convention pack's no-cycles rule (AP-006), whose prescribed remedy is extracting shared types into a common module. Before adding another console slice, extract the shared record types (SolvedItem, CritiqueRecord, and peers) into a leaf types module so slice modules can depend on memo-domain shapes without a back-edge into memo.ts.
