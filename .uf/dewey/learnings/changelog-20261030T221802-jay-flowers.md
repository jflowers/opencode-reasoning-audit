---
tag: changelog
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:18:02Z
identity: changelog-20261030T221802-jay-flowers
tier: draft
---

Inserting a new `## [x.y.z]` section directly under `## [Unreleased]` in a Keep a Changelog file silently absorbs any entries still sitting in [Unreleased] into the new release — and when the new section reuses a category heading the leftover entries already carry (e.g. `### Changed`), the version ends up with duplicate category headings. Before cutting a version section, check whether [Unreleased] still holds entries: merge them into the new version's single category headings if they ship in that release, or close them under their own version header first. Observed in opencode-supervisor's fix-supervisor-logging change: the 2.5.0 section inserted above leftover memo-delivery and README-overhaul entries produced two `### Changed` blocks under one version heading.
