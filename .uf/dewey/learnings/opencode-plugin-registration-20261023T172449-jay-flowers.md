---
tag: opencode-plugin-registration
author: jay-flowers
category: gotcha
created_at: 2026-10-23T17:24:49Z
identity: opencode-plugin-registration-20261023T172449-jay-flowers
tier: draft
---

Registering a file-source OpenCode plugin via `opencode plugin <relative-path>` silently fails: the command writes the relative spec verbatim into the project's .opencode/opencode.json, and relative plugin specs resolve against the declaring config file's directory (.opencode/) — not the invocation cwd — so the entry points nowhere and the runtime silently drops it (the failure surfaces only as a bus event). Register local plugins with an absolute path (`opencode plugin "$(pwd)"`), or list the entry in the project-root opencode.json `plugin` array, where "./index.ts" resolves against that config file's own directory. Verified in opencode-reasoning-audit spike 1.4 (opsx/audit-supervisor) against OpenCode 1.19.0; documented in the repo README section 7.2.
