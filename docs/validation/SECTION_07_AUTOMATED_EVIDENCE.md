# Section 07 — Automated Evidence

## Acceptance State

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

This evidence closes the automated/pre-device obligations for Section 07 only. It does not claim that physical cross-device handoff, real-device revoke, network partition recovery, battery behavior or physical no-double-audio/microphone ownership have passed Layer 4.

## Accepted Implementation Candidate

- Commit: `dabc897cd78133bd2cbaf17cbe3e637f5f9d7b21`
- Branch: `mudrik-core-v1`

## Validation Evidence

### Mobile Core Validation

- Workflow: `Mobile Core Validation`
- Run number: `#614`
- Run ID: `35939368198`
- Head SHA: `dabc897cd78133bd2cbaf17cbe3e637f5f9d7b21`
- Result: **SUCCESS**

Validated gates on the implementation candidate:

- frozen dependency installation: PASS;
- dependency-manifest reproducibility: PASS;
- Android device build configuration gate: PASS;
- tracked sensitive-file gate: PASS;
- full Git-history secret scan: PASS;
- dependency High/Critical gate: PASS;
- reviewed advisory dependency paths: PASS;
- ESLint: PASS;
- TypeScript: PASS;
- Mobile Core regressions: **529/529 PASS**;
- Expo Doctor: **21/21 PASS**;
- Computer Agent Phase 0: **10/10 PASS**.

### CodeQL

- Workflow: `CodeQL Security Analysis`
- Run number: `#509`
- Run ID: `35939368142`
- Head SHA: `dabc897cd78133bd2cbaf17cbe3e637f5f9d7b21`
- Result: **SUCCESS**
- JavaScript/TypeScript analysis: PASS.

## Implemented Section 07 Controls

The accepted candidate includes:

- strict trusted-surface descriptors bound to existing Section 03 device identity;
- explicit surface privacy classes:
  - `personal_private`;
  - `personal_shared_space`;
  - `household_shared`;
  - `public_or_untrusted`;
- exact-key runtime parsers and bounded identifiers/numeric fields;
- renderer capabilities as presentation metadata only;
- explicit user approval before a trusted surface is registered;
- active Section 03 device trust independently required during registration and resolution;
- monotonic trusted-surface revisions and approval timestamps;
- durable SQLite trusted-surface persistence with fail-closed parsing;
- presence observations bound to both logical session and surface;
- monotonic presence sequence/time handling;
- exact duplicate idempotence and same-sequence conflict rejection;
- bounded confidence, TTL and latency evidence;
- trusted evaluation time for presence freshness;
- deterministic candidate scoring and stable surface-ID tie-breaking;
- Follow Me opt-in;
- explicit pinning without trust/privacy/capability bypass;
- conservative private/sensitive disclosure rules;
- private-audio requirements for sensitive/shared audio presentation;
- public/untrusted automatic-surface exclusion;
- primary-surface lease generations with split-brain conflict rejection;
- exact-next-generation handoff in the live lease registry;
- monotonic handoff issue time;
- requirement that the previous lease was active when the new lease was issued;
- stale generation/replay rejection;
- privacy-state preservation across lease generations;
- reconnect reconciliation that selects a single highest valid generation and fails closed on same-generation conflict;
- handoff state manifest carrying references only;
- credential-shaped/authority-shaped manifest data rejection;
- manifest binding to the immediately previous source owner and active target lease;
- zero inherited execution, sensor, memory or disclosure authority;
- provider/hardware-neutral contracts only; no Section 08 device/media orchestration.

## Adversarial Evidence Highlights

Regression coverage proves at minimum:

- malformed and hidden surface fields fail closed;
- duplicate renderer capabilities are rejected deterministically;
- revoked/untrusted device evidence cannot make a surface eligible;
- live candidate input cannot override the approved surface privacy class;
- stale/conflicting presence sequences fail closed;
- cross-session presence replay is rejected;
- future or expired presence evidence is ineligible;
- low-confidence automatic private disclosure is blocked;
- explicit pin to an ineligible target fails closed instead of falling back;
- Follow Me disabled does not move presentation automatically;
- public/untrusted surfaces require confirmed manual selection;
- sensitive audio requires personal-private plus private-audio capability;
- candidate ordering does not change deterministic selection;
- same-generation competing primary owners fail closed;
- higher-generation stale replay cannot reclaim ownership;
- time rollback in a newer handoff generation is rejected;
- a handoff cannot start from a predecessor already inactive at target issuance;
- reconnect reconciliation rejects competing owners;
- handoff privacy downgrade fails closed;
- forged source-surface manifests are rejected;
- source lease must be exactly the previous generation;
- hidden authority fields and credential-shaped references fail closed;
- malformed persisted trusted-surface/lease records fail closed;
- persisted approval timestamp rollback is rejected.

## Closed Defects

See:

- `docs/validation/SECTION_07_DEFECTS.md`.

No known unresolved Critical or High Section 07 defect remains in the automated/pre-device scope at the accepted implementation candidate.

## Deferred Layer 4 Evidence

Still mandatory before final Section 07 production closure:

- real phone <-> web/display handoff;
- at least two trusted physical devices;
- explicit pin/unpin on device;
- Follow Me enable/disable on device;
- Wi-Fi/cellular/offline/reconnect transitions;
- source process death during handoff;
- destination offline mid-handoff;
- physical device revoke while active;
- no double microphone/audio ownership on physical devices;
- private-content suppression on a shared physical display/speaker;
- Section 04 privacy state preservation on the real destination;
- headset/Bluetooth behavior where supported;
- AR/VR/spatial behavior only on supported hardware;
- latency, battery and recovery behavior;
- accessibility and visible handoff status.

## Acceptance Rule

Section 07 is accepted only at the pre-device level. Cross-device presence decides **where** an already-authorized presentation may appear; it never decides **what** the user may disclose, sense, remember or execute. Destination surfaces receive no authority merely because the session moves to them.
