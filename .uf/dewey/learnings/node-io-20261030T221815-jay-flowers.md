---
tag: node-io
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:18:15Z
identity: node-io-20261030T221815-jay-flowers
tier: draft
---

In Node.js, `fs.openSync`/`fs.readFileSync` on a FIFO blocks until a writer appears, stalling the event loop regardless of any size bound checked after the open — the bound never runs because the open never returns, and a FIFO's fstat size (0) is unrelated to what a writer can push through it. A 'bounded read' implemented as open → fstat → size-check → read therefore does not protect against planted non-regular files, only planted large regular files. Observed in opencode-supervisor's readBoundedFile (opsx/fix-supervisor-logging): the function was introduced specifically as anti-stall hardening ('a planted oversized file ... instead of stalling the event loop') yet a FIFO at any guarded path (approvals.json, supervisor config.json) hangs the whole OpenCode server at plugin load. Fix pattern: after `fstatSync(fd)`, reject non-regular descriptors (`if (!stats.isFile())` → treat as a skip-with-warning error) so planted FIFOs and device files fail open like oversized files instead of hanging; apply the same check to every reader of adversary-writable state.
