---
tag: documentation
author: jay-flowers
category: pattern
created_at: 2026-10-25T19:00:01Z
identity: documentation-20261025T190001-jay-flowers
tier: draft
---

A repo-rename change's stale-reference gate (a grep over repository files, like rebrand-supervisor task 3.2) cannot see the issue tracker: open content issues filed under the old name keep prescribing the dead surface. In opencode-supervisor's 2.0 rename, tutorial issue #4 (filed during the prior change) still titled "adopting opencode-reasoning-audit" and scoped "the 8 env knobs and the session-config key (opencode-reasoning-audit)" — every one of those names is silently ignored by 2.0 (no alias layer), so executing the issue as written would produce a tutorial teaching no-op configuration. The file-scoped grep gate verified clean while the tracker stayed stale. Pattern: when a rename/identity change lands, sweep open labeled issues (tutorial, blog, docs) for old-name titles and dead config-surface references in the same change — retitle or comment on affected issues and reference them in the change's tasks.md workflow follow-up alongside the newly filed gate issues, so the tracker stays as current as the files.
