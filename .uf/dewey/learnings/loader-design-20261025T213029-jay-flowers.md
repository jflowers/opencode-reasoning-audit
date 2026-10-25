---
tag: loader-design
author: jay-flowers
category: pattern
created_at: 2026-10-25T21:30:29Z
identity: loader-design-20261025T213029-jay-flowers
tier: draft
---

When a loader enforces a count cap on config files, apply the cap at read time (after the deterministic sort), not after reading and parsing every file. Reading and parsing N files to keep 20 means the bound does not bound the I/O/parse work, and dropped items still emit their own parse warnings, polluting the warning stream with references to discarded entries. Sort first, slice to the cap, then read and parse — the drop-count warning can be emitted from the loader using the pre-cap file count.
