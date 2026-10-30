---
tag: plugin-logging
author: jay-flowers
category: pattern
created_at: 2026-10-30T22:19:10Z
identity: plugin-logging-20261030T221910-jay-flowers
tier: draft
---

When a plugin runs inside a host process and its log sink is the host's own HTTP endpoint (e.g., OpenCode's /log), load-time diagnostics fire into a listener-down window where fire-and-forget delivery silently drops them — and message dedupe would suppress the retry. The opencode-supervisor fix-supervisor-logging change (FR-052..FR-055) establishes the pattern: queue every bootstrap-time warning (directive loading, config-file parsing, options validation) in an array and flush it inside the first hook invocation's config resolution, when the listener is reliably up; move the identity/version line to the same first-hook moment. Per-instance flush flags keep multiple server() registrations from swallowing each other's warnings while the identity line itself stays once-per-process.
