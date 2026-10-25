---
tag: upgrade-migration
author: jay-flowers
category: pattern
created_at: 2026-10-25T18:59:52Z
identity: upgrade-migration-20261025T185952-jay-flowers
tier: draft
---

For breaking environment-variable renames with a documented clean cut (no alias reads), pair the migration table with a detect-and-warn step at startup: scan process.env for the legacy prefix and log a one-line pointer to the migration table without reading the values. This preserves the no-alias contract (the legacy names still have no effect) while converting the most painful failure mode — a user's settings silently reverting to defaults, e.g. a disabled tool guard silently re-arming — into an observable event. Warn-only detection costs a few lines in the load-time identity log and does not reopen the dual-read surface the clean-cut decision rejected.
