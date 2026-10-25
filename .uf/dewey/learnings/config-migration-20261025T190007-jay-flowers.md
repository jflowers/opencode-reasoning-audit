---
tag: config-migration
author: jay-flowers
category: pattern
created_at: 2026-10-25T19:00:07Z
identity: config-migration-20261025T190007-jay-flowers
tier: draft
---

Clean-break configuration renames (e.g., env-var prefix changes) are safe to ship when four mitigations land together: (1) a semver MAJOR version bump, (2) a complete old→new migration table in the README covering every renamed variable plus any removed ones, (3) a CHANGELOG BREAKING entry enumerating each rename individually, and (4) a startup log line printing the EFFECTIVE configuration (not just defaults) so operators can detect silent fallback-to-defaults once legacy names stop being read. Pair with a grep gate verifying zero live references to the old names outside historical artifacts, and a tracked issue for a future legacy-name detect-and-warn. Verified in opencode-supervisor 2.0.0 (OPENCODE_AUDITOR_* → OPENCODE_SUPERVISOR_*): legacy names are silently ignored by design, but the identity log line exposes the effective auditor model/variant at load time, giving operators a detection point without any alias layer.
