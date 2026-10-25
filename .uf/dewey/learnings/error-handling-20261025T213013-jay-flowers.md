---
tag: error-handling
author: jay-flowers
category: gotcha
created_at: 2026-10-25T21:30:13Z
identity: error-handling-20261025T213013-jay-flowers
tier: draft
---

A single try/catch around a directory listing plus a per-file read loop makes any one unreadable file destroy the whole policy set. In opencode-supervisor's loadDirectiveFiles, fs.readFileSync runs inside .map inside the directory-level try, so one EACCES file returns [] for every directive — all enforcement silently gone with no warning, despite FR-032 requiring per-file skip-with-warning. Fail-open loaders over collections need per-item error handling: wrap the per-item read, skip-and-warn on failure, and reserve the empty-set return for directory-level failures only.
