---
tag: content-pipeline
author: jay-flowers
category: gotcha
created_at: 2026-10-26T01:48:17Z
identity: content-pipeline-20261026T014817-jay-flowers
tier: draft
---

In jflowers/opencode-supervisor the documentation-gate issue label is `documentation`, not `docs`. A curator sweep filtering `gh issue list --label docs --state open` gets no results and can falsely conclude the docs gate is unsatisfied — or file a duplicate — when a correctly labeled `documentation` issue exists. List the repo's open issues (or labels) before treating a label-filtered empty result as proof of absence.
