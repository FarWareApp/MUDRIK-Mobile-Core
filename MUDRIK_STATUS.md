# MUDRIK Project Status

Last consolidated: 2026-09-13

## Authoritative Execution Model

MUDRIK is developed through the twenty-section plan in:

`docs/architecture/MUDRIK_20_SECTION_EXECUTION_PLAN.md`

Every section uses five validation layers:

1. specification/static correctness;
2. unit/component verification;
3. integration/security/adversarial verification;
4. physical/real-environment/E2E/recovery verification;
5. release/independent-review/evidence gate.

The owner elected to defer physical phone/hardware validation until the broader pre-device implementation program is substantially complete. This changes scheduling only; it does **not** waive Layer 4 or authorize production/freeze tags for deferred sections.

## Repository

- Repository: `FarWareApp/MUDRIK-Mobile-Core`
- Branch: `mudrik-core-v1`
- Repository visibility: **public**
- Android application ID: `com.farwareapp.mudrik`
- Production AI/server transport remains decoupled from Mobile UI until the appropriate gates authorize it.

## Section State Summary

### Section 01 — Mobile Core Freeze

`OPEN — PHYSICAL ANDROID LAYER 4 DEFERRED`

Automated/pre-device Mobile Core hardening is strong, but the core is **not finally frozen**. `MOBILE-CORE-FROZEN` remains forbidden until the mandatory physical Android matrix passes.

Reference APK evidence before deferral:

- candidate `acecb662e6bac231e18a62bccc45197794bda172`;
- Mobile Core Validation run #93 / ID `34708290715`: SUCCESS;
- Android Device Validation APK run #2 / ID `34708290677`: SUCCESS.

Important closed defect: `S01-DATA-001` — High / Closed. Project-only attachments are protected from orphan cleanup.

### Section 02 — Platform Security Foundation

`PRE-DEVICE COMPLETE — OPEN / LAYER 4 DEFERRED`

Accepted candidate:

`256d55f2b93f33468d3c98d9e3a8192e2c584e1f`

Evidence:

- Mobile Core Validation #133 / `34714989382`: SUCCESS;
- CodeQL #26 / `34714989334`: SUCCESS;
- regressions: **57/57 PASS**;
- Expo Doctor: **21/21 PASS**;
- Computer Agent Phase 0: **10/10 PASS**;
- dependency audit: **0 Critical / 0 High / 2 reviewed Moderate**;
- full-history secret scan: PASS.

The section includes default-deny capability policy, exhaustive risk classification, scoped filesystem/network/background/elevation authority, strict runtime validation, secret-reference boundaries, secure-storage contracts, redacted security events, CodeQL/dependency/secret gates and repository security controls.

Important closed defect: `S02-AUTH-001` — High / Closed.

### Section 03 — Account Identity, Authentication and Device Trust

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

Accepted candidate:

`5726fc059698ebb36590f8980c862f83099fb00b`

Evidence:

- Mobile Core Validation #159 / `34766097157`: SUCCESS;
- CodeQL #52 / `34766097108`: SUCCESS;
- regressions: **101/101 PASS**;
- Expo Doctor: **21/21 PASS**;
- Computer Agent Phase 0: **10/10 PASS**;
- dependency audit: **0 Critical / 0 High / 2 reviewed Moderate**;
- full-history secret scan: PASS.

Implemented boundaries include typed account/device/session/key identities, passkey-first assurance, step-up policy, short-lived device/key-bound sessions, refresh-family reuse detection, one-time pairing, scoped revocation, challenge binding, device trust and privacy-safe inventory/audit schemas.

### Section 04 — Privacy, Permissions and Observation Control

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

Accepted candidate:

`0bfc86e83bdca2bf79ad1ff061709a08889501c4`

Evidence:

- Mobile Core Validation #192 / `34773109075`: SUCCESS;
- CodeQL #85 / `34773109004`: SUCCESS;
- regressions: **151/151 PASS**;
- Expo Doctor: **21/21 PASS**;
- Computer Agent Phase 0: **10/10 PASS**;
- dependency audit: **0 Critical / 0 High / 2 reviewed Moderate**;
- full-history secret scan: PASS.

Implemented boundaries include observation privacy state machine, natural-language privacy fast path, dedicated V7 privacy persistence, fail-closed recovery, live monotonic Sensor-State Registry, activation policy, truth resolver, restart/handoff reconciliation, privacy audit events and UI indicator model.

Detailed evidence:

- `docs/validation/SECTION_04_PRIVACY_PERMISSIONS_OBSERVATION_GATE.md`
- `docs/validation/SECTION_04_AUTOMATED_EVIDENCE.md`
- `docs/validation/SECTION_04_DEFECTS.md`

### Section 05 — Voice Runtime

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

Accepted candidate:

`504c42e1902665858a61ce9df6e3fbcab844b67c`

Evidence:

- Mobile Core Validation ID `34776183455`: SUCCESS;
- CodeQL ID `34776183457`: SUCCESS;
- regressions: **215/215 PASS**;
- Expo Doctor: **21/21 PASS**;
- Computer Agent Phase 0: **10/10 PASS**;
- dependency audit: **0 Critical / 0 High / 2 reviewed Moderate**;
- full-history secret scan: PASS.

The authoritative runtime lives in `src/core/voice`. It includes streaming STT/TTS contracts, VAD ordering, turn generation/replay protection, barge-in, privacy-bound microphone activation, provider-neutral routing/failover boundaries, cancellation, end-of-turn logic, latency evidence and privacy-safe audit events.

Detailed evidence:

- `docs/validation/SECTION_05_VOICE_RUNTIME_GATE.md`
- `docs/validation/SECTION_05_AUTOMATED_EVIDENCE.md`
- `docs/validation/SECTION_05_DEFECTS.md`

### Section 06 — Smart Companion

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

Accepted candidate:

`97ac1435eee06a96e4de1b2797baa5ec90a0c3e0`

Evidence:

- Mobile Core Validation #284 / `34781835325`: SUCCESS;
- CodeQL #177 / `34781835439`: SUCCESS;
- regressions: **239/239 PASS**;
- Expo Doctor: **21/21 PASS**;
- Computer Agent Phase 0: **10/10 PASS**;
- dependency audit: **0 Critical / 0 High / 2 reviewed Moderate**;
- full-history secret scan: PASS;
- no known unresolved Critical/High Section 06 defect.

Implemented boundaries include one primary companion identity, strict provider-neutral profile validation, bounded personality/presence configuration, V8 non-destructive persistence, monotonic revision protection, consistent text/voice/avatar identity projection, memory-policy reference-only binding and explicit zero execution/sensor/memory/disclosure authority.

Detailed evidence:

- `docs/validation/SECTION_06_SMART_COMPANION_GATE.md`
- `docs/validation/SECTION_06_AUTOMATED_EVIDENCE.md`
- `docs/validation/SECTION_06_DEFECTS.md`

### Section 07 — Cross-Device Presence

`PRE-DEVICE IMPLEMENTATION — ACTIVE`

Section 07 is now the only active implementation section.

Primary objectives:

- trusted-surface/device presence model;
- one logical companion session with one primary interactive surface;
- deterministic presence confidence and surface ranking;
- device trust/privacy classification before presentation;
- explicit user pinning and handoff control;
- replay/stale/conflicting presence update protection;
- private-content suppression on shared/untrusted surfaces;
- handoff that preserves session/profile/task/privacy state without granting new authority;
- prevention of multiple surfaces simultaneously owning microphone/spoken-output turn-taking;
- safe offline/reconnect behavior without split-brain companion identities.

Physical multi-device handoff tests remain Layer 4 and will be deferred under the recorded exception. Section 07 pre-device work must use simulated/contract-level trusted devices and must not pretend real hardware handoff has passed.

## UI/UX Detail Preservation Rule

Authoritative detail ledger:

`docs/architecture/MUDRIK_UI_UX_DETAIL_REGISTRY.md`

Small product details are mandatory product contract. This includes the text-entry box, its geometry, the intended attachment paperclip (`📎`), image/video/file attachment flows, draft tray, message bubbles, message timestamps, send/stop/retry/error states, keyboard/safe-area behavior, floating quick actions, RTL/LTR and accessibility.

Known chat gaps remain explicitly tracked rather than forgotten:

- current attachment control is `＋`, while paperclip presentation is `INTENDED/MISSING`;
- `ChatMessage.createdAt` exists, while bubble timestamp rendering is `MISSING/INTENDED`.

Deferred UI items are not optional and will be implemented in their correct active scope.

## Mobile Core Architecture Rule

- app-first architecture remains mandatory;
- UI is presentation/interaction, not authority;
- chat remains source-agnostic;
- AI/model output is untrusted input, never authority;
- companion/personality never grants tool/sensor/memory/disclosure authority;
- every module should retain one clear responsibility;
- later server/AI/agent integration must not weaken Mobile privacy/security boundaries.

## Dependency / Tooling Posture

Current stack includes Expo SDK 57, React Native, TypeScript, SQLite and Expo Router.

Validation includes frozen Yarn dependencies, ESLint `9.39.5`, `eslint-config-expo 57.0.2`, TypeScript, Expo Doctor `1.20.4`, Node 22, CodeQL JS/TS, dependency audit, full-history secret scan and pinned GitHub Actions.

Known reviewed Moderate transitive advisories remain:

- `uuid@7.0.3` through Expo configuration tooling;
- `decode-uri-component@0.2.2` through `expo-router -> query-string`.

No incompatible override is accepted merely to silence an advisory.

## Physical Validation Debt

No section with physical/OS/provider/real-network obligations is finally closed while Layer 4 is deferred.

The owner does **not** need to stop current implementation work to test the phone now. When the deferred physical phase starts:

1. rebuild artifacts from the then-current exact candidate SHAs;
2. execute every section's Layer 4 matrix;
3. record PASS/FAIL/BLOCKED evidence;
4. classify and repair every failure;
5. add automated regression coverage where feasible;
6. rerun full CI/CodeQL/security gates;
7. only then authorize final freeze/release tags.

Section 20 cannot close until deferred Layer 4 obligations from Sections 01–19 are completed or explicitly proven not applicable.

## Next Work

1. Execute Section 07 Cross-Device Presence from contracts/policy first, not hardware-specific UI.
2. Preserve Sections 01–06 as open for their deferred Layer 4 obligations.
3. Keep UI/UX detail changes registered and do not silently drop future intended work.
4. Do not couple production AI/server/sensor authority merely to satisfy pre-device tests.

## Development Rule

For every section:

1. define scope and explicit non-goals;
2. implement deterministic contracts/policy before adapters/UI where appropriate;
3. run unit/component and integration/adversarial gates;
4. fix failures rather than suppress them;
5. record exact evidence and defects;
6. keep deferred physical obligations explicit;
7. create stable milestone/freeze tags only when all required gates have actually passed.
