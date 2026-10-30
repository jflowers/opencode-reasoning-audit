---
tag: documentation
author: jay-flowers
category: gotcha
created_at: 2026-10-30T22:17:31Z
identity: documentation-20261030T221731-jay-flowers
tier: draft
---

When a change differentiates user-visible tool-result text by assurance level (invariants-only pass vs LLM-reviewed pass vs failed-open), documenting the underlying state in the configuration/reference section is not sufficient: every documentation section describing the affected surface needs the distinction. In opencode-supervisor 2.5.0, the no-model state was documented in README §7 (Configuration) and §9 (Limitations), but §5 (request_audit) and §4.1 (audit loop) kept describing the LLM audit as unconditional, leaving the new anti-overclaim result strings invisible in the tool documentation. Pattern: after changing a tool's result semantics, enumerate every README section that names the tool or describes the affected pipeline stage and update all of them in the same pass — not only the configuration reference that owns the new state.
