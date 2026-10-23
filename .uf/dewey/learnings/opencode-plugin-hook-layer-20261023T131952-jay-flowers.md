---
tag: opencode-plugin-hook-layer
author: jay-flowers
category: gotcha
created_at: 2026-10-23T13:19:52Z
identity: opencode-plugin-hook-layer-20261023T131952-jay-flowers
tier: draft
---

opencode-reasoning-audit hook layer (opsx/audit-supervisor, task 3.1): (1) src/auditor.ts's resolveAuditorConfig declares return type AuditConfig — extended knob fields (e.g. HookConfig.memoLimits) passed in via the base survive the runtime spread but are invisible to the type system; reference the pluginConfig defaults object directly for extended-knob fallbacks instead of base.<extendedField>. (2) @opencode-ai/plugin does not re-export SDK types (Event, Part, ReasoningPart); derive them from Hooks/PluginInput via Parameters<NonNullable<Hooks['event']>> and Parameters<PluginInput['client']['session']['prompt']>[0] (the .opencode/lib/agent-executor.ts convention) rather than importing @opencode-ai/sdk directly. (3) The SDK prompt-body typings lag the runtime 'variant' field — augment with NonNullable<PromptOptions['body']> & { variant?: string }. (4) Verify TS soundness with a temp-dir tsconfig (typeRoots pointed at the repo's node_modules/@types, types:['node']) since the repo has no tsconfig; bunx tsc resolves from global cache without touching bun.lock.
