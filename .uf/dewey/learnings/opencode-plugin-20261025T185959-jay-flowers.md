---
tag: opencode-plugin
author: jay-flowers
category: pattern
created_at: 2026-10-25T18:59:59Z
identity: opencode-plugin-20261025T185959-jay-flowers
tier: draft
---

A plugin identity rename touches more surfaces than the source tree: the exported PluginModule id, the hook layer's session-config key constant, the pure config resolver's inline session-override lookup, package.json/bun.lock identity, and every user-facing doc. Two verification steps gate it: (1) a repo-wide grep of the old name with every hit explicitly classified historical vs live — an include-filtered *.ts grep proving zero live-code matches is the strongest signal; (2) a check of host config files (e.g., opencode.json) for id-based references — path-based plugin registration is id-agnostic, but id-based config lookups fail open to defaults, so a missed site silently disables configuration instead of erroring. Structural fix: consolidate the identity into one exported constant in the pure src/ layer, imported by the hook layer for both the config key and the plugin id, so future renames are a one-site change.
