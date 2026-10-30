---
tag: typescript
author: jay-flowers
category: pattern
created_at: 2026-10-30T22:18:44Z
identity: typescript-20261030T221844-jay-flowers
tier: draft
---

Reordering an exported TypeScript function's parameters so a new all-optional-props object comes first creates a silently type-compatible breaking change: structural typing accepts the old positional argument (the old parameter's type satisfies the new optional-props interface), so existing callers keep compiling while their argument is quietly dropped. When adding a config-sources parameter ahead of an existing one, either append it after existing params, fold both into one options object, or bump MAJOR — and test that the old call shape both compiles and behaves before labeling the release backward-compatible.
