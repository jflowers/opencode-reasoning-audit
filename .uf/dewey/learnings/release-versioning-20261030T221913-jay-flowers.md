---
tag: release-versioning
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:19:13Z
identity: release-versioning-20261030T221913-jay-flowers
tier: draft
---

In TypeScript, widening an exported interface property from `string` to `string | undefined` (adding `?`) is a read-side breaking change even though constructing the object stays source-compatible: consumers that use the property as a `string` fail to compile. Standard TypeScript semver therefore treats it as breaking and requires a major bump. When shipping such a change in a minor anyway (justified for a source-distributed plugin with rare type-level consumers), record the deviation explicitly in the changelog migration notes and reference the project's semver rule, so the versioning contract stays interpretable.
