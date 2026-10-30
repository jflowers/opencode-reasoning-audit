---
tag: plugin-logging
author: jay-flowers
category: pattern
created_at: 2026-10-30T22:19:08Z
identity: plugin-logging-20261030T221908-jay-flowers
tier: draft
---

Deferred bootstrap warnings for plugin logging (opencode-supervisor FR-052..FR-055): a plugin that logs through the host's HTTP /log endpoint cannot reliably emit during server() bootstrap — the listener may not be up yet, and fire-and-forget delivery silently drops the entry while per-message dedupe would suppress a later retry. The working pattern: collect all load-time warnings (directive/config/options parse failures) in a queue, flush them at first-hook time inside the per-use config builder when the listener is reliably up (flush per server() instance, since the identity line it accompanies is once-per-process), and hold once-flags in an exported state object so test harnesses that re-register the plugin can reset them. Distinguish a failed host-model lookup ("pending, will retry") from authoritative absence so the log never freezes a premature 'none', and announce a late-resolving model so the earlier 'none' is not the last word.
