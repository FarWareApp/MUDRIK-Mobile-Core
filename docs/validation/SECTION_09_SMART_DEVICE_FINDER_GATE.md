# Section 09 — Smart Device Finder and Spatial Locating Gate

## Status

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

Accepted pre-device candidate:

`936cb35ee4a9e79fa84a9edddb1313fccdd85dd2`

Automated evidence:

- `docs/validation/SECTION_09_AUTOMATED_EVIDENCE.md`
- `docs/validation/SECTION_09_DEFECTS.md`

Accepted-candidate validation:

- Mobile Core Validation run `#706` / ID `36133983162`: **SUCCESS**;
- CodeQL Security Analysis run `#601` / ID `36133983176`: **SUCCESS**;
- Mobile Core regressions: **649/649 PASS**;
- Expo Doctor: **21/21 PASS**;
- Computer Agent Phase 0: **10/10 PASS**;
- no known unresolved Critical/High Section 09 defect in automated/pre-device scope.

Section 09 establishes a privacy-preserving, evidence-bounded device-finding layer for already-authorized paired devices. It may resolve a target, evaluate authorized locating evidence, produce a bounded location/confidence result, and request a supported locate action such as ring or guided search. It never creates trust, activates sensors by itself, tracks people, or fabricates precision.

## Authoritative Architecture

- `docs/architecture/MUDRIK_SMART_DEVICE_FINDING.md`
- `docs/architecture/MUDRIK_20_SECTION_EXECUTION_PLAN.md`
- Section 02 owns capability authorization.
- Section 03 owns device identity, pairing and trust.
- Section 04 owns sensor activation/privacy for UWB, Bluetooth proximity, camera, location, presence and spatial sensing.
- Section 07 owns cross-device surface presence/handoff.
- Section 08 owns generic device/media orchestration.

Target flow:

`Find Request -> Authorized Target Resolver -> Authorized Signal Evidence -> Fusion/Confidence -> Location Result / Locate Action`
## Scope

- strict find-device request contract with monotonic sequencing;
- account-bound trusted-device target resolution;
- bounded user aliases without inventing device identity;
- optional left/right/case component selection;
- dedicated least-privilege `device.locate` and `device.ring` capability boundaries;
- provider-neutral locating-signal contracts;
- UWB/Bluetooth/Wi-Fi/device-report/last-seen/manual/visual/spatial evidence descriptors;
- freshness, reliability and precision represented independently;
- monotonic signal registry with replay/conflict rejection;
- deterministic fusion and confidence classes: `confirmed`, `high`, `medium`, `low`, `unknown`;
- room/zone/furniture/distance/direction detail only when supported by current evidence;
- short-lived last-seen snapshots;
- provider-neutral ring/vibrate/flash/wake adapter declarations;
- guided-search state/results without claiming unsupported precision;
- offline-capable local evidence contracts;
- typed/sanitized failures and zero inherited authority.

## Explicit Non-Goals

- no new pairing/trust establishment — Section 03;
- no silent UWB/Bluetooth/camera/location activation — Section 04;
- no continuous person/household-member tracking;
- no unrestricted device control or raw remote shell;
- no generic app/media orchestration — Section 08;
- no emergency tracking — Section 10;
- no computer-agent execution — Sections 11–13;
- no internet control plane — Section 14;
- no production remote transport — Section 15;
- no unrestricted long-term location history;
- no cloud upload of raw sensor streams by default;
- no centimeter/furniture precision without evidence supporting it;
- no production AR/VR or vision adapter before physical validation.

## Core Security / Privacy Invariants

1. A device is locatable only when Section 03 trust proves the exact account/device binding.
2. Alias or proximity alone never creates trust.
3. `device.locate` grants locating authority only; it never grants `device.control`, shell, filesystem, camera or microphone authority.
4. `device.ring` is a separate active-action capability and cannot be inferred from `device.locate`.
5. Sensor evidence never activates its underlying sensor; Section 04 authorization is independent.
6. Camera/vision evidence requires an independently authorized visible camera path.
7. Unknown, revoked, suspended or mismatched devices fail closed.
8. Unknown fields, malformed IDs, duplicate aliases, unsafe integers, NaN/infinity and credential/script fields fail closed.
9. Stale, future, replayed or conflicting locating evidence cannot improve a result.
10. Confidence and spatial precision are independent; high confidence cannot manufacture finer precision.
11. A fused result may never be more spatially precise than its supporting evidence.
12. One weak signal cannot become `confirmed`.
13. Last-seen evidence must remain visibly historical and cannot be presented as current.
14. Household/shared-surface presentation does not widen disclosure authority.
15. Ring/vibrate/flash/wake actions re-check current trust and capability at execution time.
16. Locate actions carry no inherited tool, sensor, memory, disclosure or execution authority.
17. Device finding must not become covert person tracking.
18. Ambiguous target identity produces clarification, not an arbitrary target.
## Layer 1 — Specification / Static Correctness

Required PASS evidence:

- exact-key runtime parsers for all untrusted locating contracts;
- existing Section 03 device IDs/trust reused;
- dedicated locate/ring capabilities classified in Section 02 risk policy;
- no wildcard/general device authority introduced;
- sensor contracts contain derived/bounded evidence only, not raw streams or credentials;
- explicit spatial precision lattice and confidence model;
- no location wording layer can claim finer precision than the fused result;
- lint, TypeScript, CodeQL, dependency and secret gates green.

## Layer 2 — Unit / Component Verification

Mandatory deterministic cases include:

- valid locate/ring/guidance request parses;
- unknown request kind and hidden fields rejected;
- malformed device IDs/aliases/components rejected;
- first sequence must be zero and subsequent requests monotonic;
- exact duplicate idempotent; same-sequence conflict rejected;
- target resolver accepts only exact currently trusted account/device binding;
- alias ambiguity requires clarification;
- revoked/suspended/pending devices are ineligible;
- signal descriptors reject unknown fields/IDs/kinds;
- confidence/reliability ranges reject NaN/infinity;
- unsafe/future/expired timestamps rejected using trusted evaluation time;
- duplicate signal IDs and conflicting sequences rejected;
- evidence precision is bounded and normalized;
- stale last-seen remains historical;
- fusion is deterministic under input reordering;
- unsupported precision is degraded rather than guessed;
- ring action requires a separate current capability grant.
## Layer 3 — Integration / Security / Adversarial Verification

Mandatory adversarial cases include:

- spoofed target device identity;
- alias collision used to select another device;
- device revoked after resolution but before ring/action;
- locating grant supplied where ring grant is required;
- generic `device.control` supplied instead of locate/ring grant;
- forged UWB/Bluetooth/visual evidence;
- stale strong signal attempting to override fresh weaker evidence;
- high confidence with room-only evidence attempting furniture/exact claim;
- visual evidence while camera authority is absent;
- hidden token/API key/raw sensor payload/script field injection;
- cross-session signal replay;
- sequence rollback/conflict;
- unsafe integer and timestamp overflow;
- household-member/device-account mismatch;
- shared display attempting sensitive precise-location disclosure;
- candidate/evidence input reordering.

Any ambiguity resolves to no active side effect and no fabricated precision.

## Layer 4 — Physical / Real-Environment Verification

**DEFERRED** under the owner-directed physical-validation exception.

Before final closure verify supported hardware for Bluetooth proximity, UWB, Wi-Fi/last-seen, real ring/vibrate/flash/wake, offline finding, dead battery/offline targets, one-earbud scenarios, room transitions, guided-search feedback, camera opt-in, AR guidance, shared-screen privacy, latency, battery and accessibility.
## Layer 5 — Evidence / Release Gate

Pre-device completion requires:

- exact implementation candidate SHA;
- Mobile Core Validation green;
- CodeQL green;
- Section 09 plus whole-core regressions green;
- zero unresolved Critical/High Section 09 defects;
- dependency/secret gates green;
- defect/evidence records;
- Layer 4 obligations explicit.

Production/final Section 09 closure requires physical Layer 4 and exact-candidate revalidation.

## Core Acceptance Rule

MUDRIK may report only the device location, proximity or direction justified by current authorized evidence. When evidence is insufficient, it must say so and guide the user progressively instead of guessing.
