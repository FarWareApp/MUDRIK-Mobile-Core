# Section 06 — Smart Companion Core Gate

## Status

`PRE-DEVICE IMPLEMENTATION — ACTIVE`

Section 06 establishes one primary, user-configurable companion identity and interaction policy. The companion shapes presentation and conversational style only. It never grants capabilities, permissions, sensor access, tool authority, memory authority or device trust.

## Scope

- one primary companion profile;
- enabled/disabled state;
- stable companion identity independent of AI/STT/TTS providers;
- selectable display name, voice profile, avatar profile and presentation;
- parameterized personality dimensions;
- presence level;
- preferred-language preferences;
- memory-policy binding identifier only, without memory access implementation;
- consistent profile projection for text and voice surfaces;
- deterministic initiative policy;
- explicit zero-authority companion boundary;
- durable SQLite persistence and migration from the legacy profile;
- fail-closed validation for malformed persisted/untrusted profile data.

## Explicit Non-Goals

The following belong to later sections and MUST NOT be silently implemented here:

- cross-device trusted-surface registry, Follow Me or automatic handoff — Section 07;
- ambient device/media orchestration — Section 08;
- emergency behavior — Section 10;
- computer-agent execution — Sections 11–12;
- production intelligence/provider routing — Section 18;
- long-term memory implementation — Section 16;
- smart-home execution — Section 19;
- production avatar renderer or AR/VR handoff.

## Layer 1 — Specification and Static Correctness

Required PASS evidence:

- `MUDRIK_SMART_COMPANION.md` remains the architectural authority;
- exactly one primary active profile is supported initially;
- profile has no provider API keys, model IDs, tokens or execution grants;
- personality/presence fields cannot imply capability authority;
- voice and avatar identifiers are renderer/provider-neutral references;
- memory binding is a reference, not memory permission itself;
- new fields migrate without destroying the legacy profile;
- TypeScript and lint pass;
- CodeQL passes;
- secret and dependency gates pass.

## Layer 2 — Unit / Component Verification

Mandatory deterministic cases:

- valid profile normalizes without widening permissions;
- invalid/extra profile fields fail closed;
- blank/oversized names are rejected or safely normalized;
- personality dimensions stay within explicit bounds;
- speaking-rate bounds are enforced;
- preferred-language entries are bounded and deduplicated;
- provider/model/credential-shaped fields are rejected;
- companion disabled state prevents proactive companion behavior;
- `silent` presence permits direct replies only;
- `normal` presence permits requested replies and necessary notifications only;
- `helpful`/`active` initiative still requires an independently authorized category;
- quiet-hours policy can suppress proactive presentation;
- no companion policy decision returns tool/sensor/memory permission authority;
- profile reset preserves unrelated conversation/project data.

## Layer 3 — Integration / Security / Adversarial Verification

Required adversarial cases:

- malicious profile attempts to inject `modelId`, `apiKey`, `toolScopes`, `permissions`, `systemPrompt` or equivalent authority-bearing fields;
- malformed persisted JSON/language lists;
- corrupted numeric personality values (`NaN`, infinity, fractions/out-of-range where disallowed);
- stale profile update attempting to overwrite a newer profile revision;
- disabled companion receiving proactive trigger;
- high initiative attempting to bypass notification/privacy policy;
- memory policy reference attempting to become direct memory-category authority;
- voice/avatar references attempting to embed a provider credential;
- reset/settings flow accidentally deleting unrelated app data.

Any ambiguity must resolve to a non-proactive, non-authoritative state.

## Layer 4 — Physical / UX Verification

**DEFERRED** under the owner-directed physical-validation exception.

Before final closure verify at minimum:

- Android profile edit/save/reset on device;
- persistence across process death/restart;
- migration from a pre-V8 database with an existing companion profile;
- disabled companion UI behavior;
- name, voice, avatar and personality choices across text/voice surfaces;
- accessibility, keyboard, RTL/LTR and mixed-language behavior;
- no conversation/project loss after companion changes;
- device performance and visual regression checks.

## Layer 5 — Evidence / Release Gate

Pre-device completion requires:

- exact candidate SHA recorded;
- Mobile Core Validation green;
- CodeQL green;
- Section 06 and whole-core regressions green;
- zero unresolved Critical/High Section 06 defects;
- dependency and secret gates green;
- defects/repairs recorded;
- Layer 4 obligations remain explicit.

Production closure additionally requires Layer 4 and final revalidation on the then-current exact candidate.

## Core Acceptance Rule

The companion may influence how MUDRIK presents and phrases an interaction. It may never decide that an action, sensor, memory category, notification, device or private disclosure is authorized. Those decisions remain with their independent policy layers.
