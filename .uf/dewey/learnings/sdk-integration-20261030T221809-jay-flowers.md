---
tag: sdk-integration
author: jay-flowers
category: pattern
created_at: 2026-10-30T22:18:09Z
identity: sdk-integration-20261030T221809-jay-flowers
tier: draft
---

When a code path swallows delivery errors (fire-and-forget logging, absorbed rejections), an API-shape mismatch against the SDK is invisible to mocked tests — the mocks mirror whatever shape the implementation guessed. Before approving such a feature, verify the endpoint request/response shapes against the installed SDK's generated type declarations (e.g., node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts and sdk.gen.d.ts). For opencode-supervisor 2.5.0 this confirmed POST /log accepts level "debug" | "info" | "error" | "warn" with { service, message, extra } and GET /config returns Config with model/small_model — both matching the plugin's usage, so the fire-and-forget path is safe rather than silently 400ing.
