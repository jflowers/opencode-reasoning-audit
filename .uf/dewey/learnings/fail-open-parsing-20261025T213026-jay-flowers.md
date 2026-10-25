---
tag: fail-open-parsing
author: jay-flowers
category: gotcha
created_at: 2026-10-25T21:30:26Z
identity: fail-open-parsing-20261025T213026-jay-flowers
tier: draft
---

try/catch around JSON.parse is not a fail-open config loader: JSON.parse accepts non-object JSON, and a `null` body parses successfully but throws a TypeError on the first property access, crashing the loader. In opencode-supervisor's directive parser, a ```supervisor fence containing `null` took down the entire plugin load, violating the 'loading SHALL never throw' requirement. Fail-open parsing of fenced/embedded JSON needs a post-parse shape check — typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) — with a warn-and-skip branch, plus regression tests for the null and array cases.
