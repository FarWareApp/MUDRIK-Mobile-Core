# Section 10 — Emergency Guardian Gate

## Status

`PRE-DEVICE IMPLEMENTATION — ACTIVE`

Section 10 defines a safety-critical, opt-in emergency-assistance boundary. It may consume explicitly authorized evidence, assess bounded risk, check responsiveness, prepare a minimal emergency packet and plan an escalation. It must not diagnose a medical condition, create sensor authority, or perform a real emergency side effect during pre-device work.

## Authoritative Architecture

- `docs/architecture/MUDRIK_EMERGENCY_GUARDIAN.md`
- `docs/architecture/MUDRIK_20_SECTION_EXECUTION_PLAN.md`
- Section 02 owns capability authorization and risk classification.
- Section 03 owns account/device identity and trust.
- Section 04 owns camera, microphone, location, presence and sensor privacy.
- Section 05 owns voice runtime mechanics.
- Section 07 owns surface privacy/handoff.
- Section 09 owns device locating only; it does not authorize person tracking.

Target flow:

`Authorized Evidence -> Risk Assessment -> Responsiveness Check -> Escalation Plan -> Explicitly Authorized Action`

## Scope

- explicit Emergency Guardian enablement/configuration state;
- strict emergency-session and event contracts;
- bounded evidence descriptors for user reports, fall/motion, wearable readings, responsiveness and authorized observation;
- independent evidence-source authorization before risk fusion;
- deterministic risk states: `normal`, `watch`, `check_user`, `urgent`, `critical`, `escalating`, `resolved`;
- responsiveness-check state and timeout contracts;
- deterministic escalation planning with no hidden side effects;
- minimum-necessary emergency packet construction;
- independently revocable contact, location and call capabilities;
- offline/local-first decision contracts where practical;
- simulation mode that is structurally incapable of real contact/call side effects;
- provider-neutral jurisdiction/platform routing declarations;
- typed sanitized failures and auditable state transitions;
- zero diagnostic authority from companion or model output.

## Explicit Non-Goals

- no medical diagnosis or claim that a heart attack, stroke, seizure, arrhythmia or other condition is confirmed;
- no production medical-device claim before regulatory/clinical review;
- no real emergency call, SMS, contact notification or emergency-service transmission during pre-device implementation/tests;
- no silent camera, microphone, location or wearable activation;
- no continuous person tracking or household-member health monitoring;
- no raw camera/audio/biometric stream retention by default;
- no ordinary conversational model path as the sole critical escalation dependency;
- no unrestricted contact-list, account, filesystem, browser, shell or network authority;
- no emergency capability inferred from proximity, AI confidence, companion personality or sensor availability;
- no hard-coded assumption that one emergency number or routing method applies globally;
- no bypass of cancellation, audit or visible state where the platform permits those controls.

## Core Safety / Privacy Invariants

1. Emergency Guardian is opt-in and disabled state grants no emergency authority.
2. Simulation mode can never produce a real emergency side effect.
3. Evidence collection authority and emergency-action authority are independent.
4. A health/sensor reading never creates trust or permission.
5. A single noisy consumer sensor reading cannot become a medical diagnosis.
6. A single weak signal cannot independently trigger irreversible escalation.
7. Explicit severe user-reported symptoms may enter an urgent assistance path without waiting for speculative model inference.
8. Camera/microphone/location evidence requires the independently authorized Section 04 path.
9. Health evidence requires the exact corresponding health-read capability and current trusted source binding.
10. Emergency contact notification requires its own current capability at action time.
11. Emergency-service call initiation requires its own current Critical capability at action time.
12. Capability checks are repeated immediately before every external emergency side effect.
13. Revocation, expiry, target mismatch or jurisdiction/platform unavailability fails closed.
14. Emergency packets disclose only explicitly permitted minimum-necessary fields.
15. Ordinary chat history, private files, unrelated account data and raw sensor streams cannot enter an emergency packet.
16. Model/companion output may propose language but cannot authorize escalation.
17. Historical evidence remains historical and cannot masquerade as a current event.
18. Conflicting or insufficient evidence degrades risk/confidence rather than inventing certainty.
19. Every state transition is deterministic for the same authorized evidence and trusted time.
20. Every simulated action is visibly marked simulated in typed state/audit output.

## Layer 1 — Specification / Static Correctness

Required PASS evidence:

- exact-key parsers for all untrusted Section 10 contracts;
- exhaustive emergency state/risk discriminators;
- existing Section 02/03/04 capability, identity, trust and sensor-policy boundaries reused;
- no wildcard or generic emergency super-capability;
- `emergency.call.initiate` remains Critical;
- simulation/production execution modes are type-visible and fail closed;
- medical wording contracts forbid definitive diagnosis from unvalidated evidence;
- emergency packet fields are explicit and minimum-necessary;
- trusted evaluation time is external to untrusted evidence;
- lint, TypeScript, dependency, secret and CodeQL gates green.

## Layer 2 — Unit / Component Verification

Mandatory deterministic cases include:

- disabled guardian rejects emergency workflow creation;
- simulation session parses and is permanently non-live;
- malformed/unknown fields, IDs, timestamps, NaN/infinity and unsafe integers fail closed;
- risk-state transitions reject invalid jumps;
- user cancellation resolves an active countdown/check where policy permits;
- responsiveness timeout cannot be forged by an untrusted event timestamp;
- one weak physiological signal does not become `critical`;
- strong explicit user emergency report produces bounded urgent handling without a diagnosis;
- fall evidence without independent source authorization is excluded;
- current/historical evidence remain distinct;
- emergency packet excludes unrelated/private fields;
- contact/call plans carry no inherited authority.

## Layer 3 — Integration / Security / Adversarial Verification

Mandatory adversarial cases include:

- forged health/wearable evidence;
- camera evidence without current camera authorization;
- microphone distress evidence without current microphone authorization;
- stale strong evidence attempting to override fresh contradictory evidence;
- device/account/source substitution after initial resolution;
- capability revocation after planning but before external action;
- contact grant supplied where call grant is required, and vice versa;
- generic network/device-control authority supplied instead of emergency authority;
- simulation-mode attempt to invoke real contact/call adapters;
- hidden token, credential, executable, URL or raw-stream injection;
- duplicate/replayed emergency events;
- timeout rollback/future-time manipulation;
- emergency packet over-disclosure;
- shared-surface disclosure of sensitive emergency details;
- jurisdiction/platform route mismatch;
- model output attempting to force `critical` or bypass confirmation policy.

Any ambiguity resolves to no irreversible external side effect.

## Layer 4 — Physical / Real-Environment Verification
**DEFERRED** under the owner-directed physical-validation exception.

Before final production closure verify supported real devices and services for fall/motion sensing, wearable health inputs, voice/haptic responsiveness checks, local/offline behavior, location retrieval, trusted-contact delivery, platform emergency-call behavior, cancellation, network/carrier loss, device restart, background execution, battery, latency, accessibility and multilingual emergency presentation.

No real emergency service or unsuspecting third party may be contacted as part of routine development validation. Physical tests must use safe test endpoints, platform-provided test mechanisms, controlled participants and legally appropriate procedures.

## Layer 5 — Evidence / Release Gate

Pre-device completion requires:

- exact implementation candidate SHA;
- Mobile Core Validation green;
- CodeQL green;
- Section 10 plus whole-core regressions green;
- zero unresolved Blocker/Critical/High Section 10 defects;
- dependency/secret gates green;
- explicit simulation-mode proof;
- defect/evidence records;
- Layer 4, regulatory and independent safety-review obligations explicit.

Production/final Section 10 closure additionally requires the deferred physical matrix, jurisdiction/platform review and an independent safety/security review appropriate to the released behavior.

## Core Acceptance Rule

MUDRIK Emergency Guardian may react quickly to possible danger, but uncertainty must remain visible. It may assist, check responsiveness and prepare an authorized escalation; it must never turn uncertain consumer-sensor or AI output into a definitive medical diagnosis or unreviewed irreversible emergency action.
