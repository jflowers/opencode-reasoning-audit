---
tag: tool-guard
author: jay-flowers
category: pattern
created_at: 2026-10-30T22:19:06Z
identity: tool-guard-20261030T221906-jay-flowers
tier: draft
---

Dual-lens protected-state guard (opencode-supervisor FR-061): to block supervised agents from touching engineer-authored state (approvals, config files, directives) without false-positive-blocking write content, pair (a) a lexically normalized path-token lens applied only to operational argument keys (filePath/path/directory/pattern) for non-bash tools — folding backslashes to slashes, collapsing `..`, folding leading dots so `.opencode` ≡ `opencode` and project/global tiers match one needle — with (b) a raw lowercased bash-command-string lens (capped at 64 KiB) that catches slash-free `cd dir && cat file` spellings the tokenizer cannot extract. Write/edit content is data, not an operation, and is never scanned. Scanning all argument values (the earlier approach) blocked documentation edits that merely mentioned a protected path. Documented residual: custom tools with non-standard path-argument key names escape the path lens.
