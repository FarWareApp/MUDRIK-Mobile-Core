# Section 06 — Smart Companion Core Gate

## Status

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

Accepted pre-device candidate:

`97ac1435eee06a96e4de1b2797baa5ec90a0c3e0`

Section 06 establishes one primary, user-configurable companion identity and interaction policy. The companion shapes presentation and conversational style only. It never grants capabilities, permissions, sensor access, tool authority, memory authority or device trust.

Automated acceptance evidence:

- Mobile Core Validation run `#284` / ID `34781835325`: **SUCCESS**;
- CodeQL Security Analysis run `#177` / ID `34781835439`: **SUCCESS**;
- Mobile/Security/Identity/Privacy/Voice/Companion regressions: **239/239 PASS**;
- Expo Doctor: **21/21 PASS**;
- Computer Agent Phase 0: **10/10 PASS**;
- dependency audit: **0 Critical / 0 High / 2 reviewed Moderate**;
- full Git-history secret scan: **PASS**;
- no known unresolved Critical/High Section 06 defect.

Detailed evidence:

- `docs/validation/SECTION_06_AUTOMATED_EVIDENCE.md`
- `docs/validation/SECTION_06_DEFECTS.md`

## Scope

- one primary companion profile;
- enabled/disabled state;
- stable companion identity independent of AI/STT/TTS providers;
- selectable display name, voice profile, avatar profile and presentation;
- parameterized personality dimensions;
- presence level;
- preferred-language preferences;
- memory-policy binding identifier only, without memory access implementation;
- consistent profile projection for text, voice and avatar surfaces;
- deterministic initiative policy;
- explicit zero-authority companion boundary;
- durable SQLite persistence and migration from the legacy profile;
- fail-closed validation for malformed persisted/untrusted profile data;
- monotonic revision protection against stale profile writes;
- truthful save-failure UX for the profile editor.

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

Status: **PASS for pre-device scope**.

Evidence includes:

- `MUDRIK_SMART_COMPANION.md` remains the architectural authority;
- exactly one primary profile is supported initially;
- profile has no provider API keys, model IDs, tokens or execution grants;
- personality/presence fields cannot imply capability authority;
- voice/avatar identifiers are provider-neutral references;
- memory binding is a reference, not memory permission itself;
- V8 migration expands the legacy profile non-destructively;
- TypeScript passes;
- lint passes without the prior Section 06 hook warning;
- CodeQL passes;
- secret and dependency gates pass.

## Layer 2 — Unit / Component Verification

Status: **PASS for pre-device scope**.

Covered deterministic cases include:

- valid profile normalization without authority widening;
- invalid/extra profile fields fail closed;
- blank/oversized names are rejected or safely normalized;
- personality dimensions stay within explicit bounds;
- speaking-rate bounds are enforced;
- preferred-language entries are bounded and deduplicated;
- provider/model/credential-shaped fields are rejected;
- disabled companion state prevents companion presentation;
- `silent`, `normal`, `helpful`, and `active` presence behavior is deterministic;
- `helpful`/`active` still require independently authorized categories for proactivity;
- quiet-hours can suppress proactive presentation;
- no companion policy decision returns tool/sensor/memory/disclosure authority;
- text/voice/avatar identity projection remains consistent;
- persisted profile is validated before use.

## Layer 3 — Integration / Security / Adversarial Verification

Status: **PASS for pre-device scope**.

Covered adversarial cases include:

- profile injection attempts for `modelId`, `apiKey`, `toolScopes`, `permissions`, `systemPrompt` and equivalent unknown fields;
- credential-shaped voice/avatar/memory references;
- malformed persisted language data;
- corrupted/out-of-range numeric personality values;
- stale profile update attempting to overwrite a newer profile revision;
- disabled companion receiving direct/proactive presentation triggers;
- high initiative attempting to bypass notification/quiet-hours policy;
- memory-policy reference attempting to become memory authority;
- malformed profile attempting to project identity;
- V7 -> V8 migration preserving existing companion data.

Any ambiguity resolves to a non-proactive, non-authoritative state.

## Layer 4 — Physical / UX Verification

**DEFERRED** under the owner-directed physical-validation exception.

Before final closure verify at minimum:

- Android profile edit/save/reset on device;
- persistence across process death/restart;
- migration from a pre-V8 database with an existing companion profile;
- disabled companion UI behavior;
- name, voice, avatar and personality choices across text/voice surfaces;
- accessibility, keyboard, safe-area, RTL/LTR and mixed-language behavior;
- no conversation/project loss after companion changes;
- device performance and visual regression checks.

## Layer 5 — Evidence / Release Gate

Pre-device evidence gate: **PASS** on candidate `97ac1435eee06a96e4de1b2797baa5ec90a0c3e0`.

Production closure is **NOT PASS** because Layer 4 remains deferred. No final production/freeze tag is authorized for Section 06.

## Core Acceptance Rule

The companion may influence how MUDRIK presents and phrases an interaction. It may never decide that an action, sensor, memory category, notification, device or private disclosure is authorized. Those decisions remain with their independent policy layers.
