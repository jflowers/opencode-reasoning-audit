---
tag: tool-guard
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:18:20Z
identity: tool-guard-20261030T221820-jay-flowers
tier: draft
---

Scanning the JSON serialization of a tool-call's arguments for protected filenames matches content payloads, not just paths: a write/edit tool's args include the file content, so any document that mentions 'approvals.json' or 'supervisor' + 'config.json' gets blocked as if it touched protected state. When a guard needs a raw-arguments lens to catch slash-free shell spellings ('cd dir && cat file'), scope the scan to path-bearing argument fields (command, filePath) rather than the full serialized object — otherwise documentation-heavy repos cannot edit their own docs under supervision, and the block reason misattributes intent.
