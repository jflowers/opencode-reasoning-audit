---
tag: determinism
author: jay-flowers
category: gotcha
created_at: 2026-10-25T21:30:30Z
identity: determinism-20261025T213030-jay-flowers
tier: draft
---

localeCompare without an explicit locale argument sorts by the ambient ICU locale, so "deterministic ordering" claims break across machines: mixed-case, accented, or unicode filenames can order differently per environment and per runtime build. When a spec requires environment-independent ordering — especially when the order decides which items survive a count cap — pin the comparison (localeCompare(b, 'en')) or compare codepoints directly.
