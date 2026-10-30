---
tag: test-hygiene
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:19:00Z
identity: test-hygiene-20261030T221900-jay-flowers
tier: draft
---

When extracting a shared test-mock module to deduplicate harness code, extract every variant of the mock in the same change. opencode-supervisor's test/mocks.ts shipped only the recording variant (app.log entries captured) while the silent stub pair (app.log no-op + config.get serving a derived model) stayed duplicated at ~12 sites across five test files — so the next mock-shape change (the diff that introduced app.log/config.get in the first place) had to touch every one of those files with identical lines and an identical explanatory comment. Detection signal: a diff that adds the same two-line client stub plus the same comment to many test files, or a new shared-mocks module whose header says "previously duplicated" while near-identical copies remain elsewhere.
