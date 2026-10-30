---
tag: logging
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:18:07Z
identity: logging-20261030T221807-jay-flowers
tier: draft
---

Fire-and-forget log delivery combined with dedupe-before-delivery permanently and silently drops diagnostics: the dedupe cache records an entry as "sent" before the POST resolves, so a delivery that fails (e.g., the server's HTTP listener not yet up during plugin bootstrap) is never retried, and re-emission of the same message is suppressed by the dedupe hit. In opencode-supervisor 2.5.0's plugin logger (src/plugin-log.ts), warnings emitted at server()-bootstrap time — config-file skips, directive-load failures — fire exactly when delivery is least reliable, and unit tests with mocked clients stay green regardless. Mitigations: defer bootstrap-critical warnings to first-hook time (as the identity line does), dedupe only after successful delivery, or queue-and-flush undelivered entries on the first successful POST.
