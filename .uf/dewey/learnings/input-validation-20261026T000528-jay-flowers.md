---
tag: input-validation
author: jay-flowers
category: gotcha
created_at: 2026-10-26T00:05:28Z
identity: input-validation-20261026T000528-jay-flowers
tier: draft
---

In the opencode-supervisor agent console, count-based bounds do not bound size. Every agent-authored text input needs an explicit fixed length ceiling before it reaches a model call or unbounded session state: reminders and reports are capped at 2000 characters, but request_audit's focus initially shipped uncapped — a single tool call could push model-output-sized text (e.g., a quoted file) into the auditor prompt, the verified trace, and the echoed result, with only the per-session audit count (8) limiting frequency, not magnitude. Rule of thumb: when adding an agent-facing tool, cap every string argument at a fixed hygiene constant (mirroring prepareReminderText/prepareReportText), especially arguments that trigger model invocations or are stored without an appendBounded cap.
