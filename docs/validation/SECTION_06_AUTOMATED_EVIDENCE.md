# Section 06 — Automated Evidence

## Acceptance State

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

This evidence closes the automated/pre-device obligations for Section 06 only. It does not claim that physical Android UX, process-death persistence, accessibility, RTL/LTR visual behavior, or production avatar/voice surfaces have passed real-device verification.

## Accepted Pre-Device Candidate

- Commit: `97ac1435eee06a96e4de1b2797baa5ec90a0c3e0`
- Branch: `mudrik-core-v1`

## Validation Evidence

### Mobile Core Validation

- Workflow: `Mobile Core Validation`
- Run number: `#284`
- Run ID: `34781835325`
- Result: **SUCCESS**

Validated gates on the exact candidate:

- frozen dependency installation: PASS;
- dependency-manifest reproducibility: PASS;
- Android device build configuration gate: PASS;
- tracked sensitive-file gate: PASS;
- full Git-history secret scan: PASS;
- dependency High/Critical gate: PASS;
- reviewed advisory dependency paths: PASS;
- ESLint: PASS with no Section 06 hook warning;
- TypeScript: PASS;
- Mobile/Security/Identity/Privacy/Voice/Companion regressions: **239/239 PASS**;
- Expo Doctor: **21/21 PASS**;
- Computer Agent Phase 0 tests: **10/10 PASS**.

Dependency audit at acceptance:

- Critical: `0`
- High: `0`
- Moderate: `2` reviewed transitive advisories

Reviewed Moderate paths remain:

1. `uuid@7.0.3` through Expo configuration tooling;
2. `decode-uri-component@0.2.2` through `expo-router -> query-string`.

No incompatible override is accepted merely to hide an advisory.

### CodeQL

- Workflow: `CodeQL Security Analysis`
- Run number: `#177`
- Run ID: `34781835439`
- Head SHA: `97ac1435eee06a96e4de1b2797baa5ec90a0c3e0`
- Result: **SUCCESS**
- JavaScript/TypeScript analysis: PASS.

## Implemented Section 06 Controls

The accepted candidate includes:

- one primary companion identity with stable `companionId`;
- enabled/disabled companion state;
- provider-neutral display name, presentation, voice-profile, avatar-profile and memory-policy references;
- bounded parameterized personality fields;
- bounded speaking rate;
- preferred-language validation and deduplication;
- explicit presence levels: `silent`, `normal`, `helpful`, `active`;
- deterministic initiative policy with quiet-hours and independent category-authorization requirements;
- structural zero-authority companion decisions for execution, sensors, memory and disclosure;
- strict profile validation with exact-key allowlist;
- rejection of authority-bearing profile fields such as `modelId`, `apiKey`, `toolScopes`, `permissions`, `systemPrompt` or equivalent additions;
- rejection of credential-shaped values inside provider-neutral profile references;
- memory-policy binding as a reference only with no memory authority;
- consistent identity projection for text, voice and avatar surfaces;
- V8 non-destructive SQLite migration preserving legacy companion data while adding the expanded profile schema;
- SQLite repository validation before persisted profile data is exposed;
- monotonic profile revision protection against stale writes;
- save flow that trims names, rejects blank names, reports failure and keeps the editor open instead of implying a failed save succeeded;
- disabled companion session controls in the UI and automatic stop if the companion becomes disabled during an active presentation session;
- profile editor controls for enablement, name, presentation, voice preference, interaction style, personality preset, presence level, personality dimensions, speaking rate and captions;
- accessibility selected/disabled semantics on the Section 06 editor controls.

## Adversarial Evidence Highlights

Regression coverage proves at minimum:

- default primary profile validates;
- authority-bearing extra fields fail closed;
- credential-shaped profile references fail closed;
- blank/invalid names, out-of-range personality values and invalid speaking rates fail closed;
- language preferences are bounded, validated and deduplicated;
- disabled companion never presents even on direct requests;
- `silent` blocks notifications and proactivity while allowing direct requests;
- `normal` blocks proactive suggestions while allowing independently authorized necessary notification presentation;
- `helpful`/`active` still require independent category authorization and quiet-hours clearance;
- initiative `0` disables proactive presentation even in active presence;
- every companion interaction decision explicitly carries zero execution/sensor/memory/disclosure authority;
- stale/non-advancing repository revisions are rejected;
- malformed persisted languages fail closed;
- text, voice and avatar surfaces project the same companion identity;
- disabled companion projects no text/voice/avatar identity;
- memory-policy binding never grants memory authority;
- malformed profile never projects identity or memory binding;
- V7 -> V8 migration is non-destructive to the companion profile.

## Deferred Layer 4 Evidence

Still mandatory before final Section 06 closure:

- Android profile edit/save/reset on a real device;
- persistence across process death/restart;
- migration from a real pre-V8 installation with existing companion data;
- disabled companion UX on device;
- text/voice/avatar identity consistency on production-like surfaces;
- actual voice/avatar reference rendering once those providers/renderers exist;
- accessibility and screen-reader verification;
- keyboard and safe-area behavior;
- Arabic/German/English RTL/LTR and mixed-language visual verification;
- compact/large phone visual regression;
- no conversation/project loss after repeated profile edits/resets;
- real performance and memory behavior.

## Acceptance Rule

Section 06 is accepted only at the pre-device level. It remains open until applicable Layer 4 evidence passes on the then-current exact production-like candidate. Companion personality/presence remains presentation policy only and never becomes an authority source.
