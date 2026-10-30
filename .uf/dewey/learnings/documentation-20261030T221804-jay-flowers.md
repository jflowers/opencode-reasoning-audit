---
tag: documentation
author: jay-flowers
category: pattern
created_at: 2026-10-30T22:18:04Z
identity: documentation-20261030T221804-jay-flowers
tier: draft
---

When a change adds src/ modules with companion test files, the AGENTS.md Project Structure update must cover every tree the change touches — the src/ tree, the test/ tree, and the test command — in one edit. In opencode-supervisor's fix-supervisor-logging change, the node --test command and the src/ tree gained plugin-log/config-file entries while the test/ tree kept its six-file listing, leaving the structure map internally inconsistent within a single commit. Practical doc-gate check: diff the repository's added files against every section of the structure map, not just the section nearest the edit.
