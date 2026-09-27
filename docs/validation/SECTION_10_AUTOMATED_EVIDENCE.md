# Section 10 — Automated Evidence

## Acceptance State

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

This evidence closes the automated/pre-device obligations for Section 10 only. It does not claim that real wearable/health sensors, real emergency contacts, carrier/OS emergency calling, background/restart behavior, offline recovery, battery, latency, accessibility, jurisdictional review or regulated medical behavior have passed Layer 4.

## Accepted Implementation Candidate

- Commit: `acc11fe839c12cae38e31ce25870290b1c09199f`
- Branch: `mudrik-core-v1`
- Candidate message: `Complete emergency guardian pre-device safeguards`

## Validation Evidence

### Mobile Core Validation

- Workflow: `Mobile Core Validation`
- Run number: `#724`
- Run ID: `36346111692`
- Head SHA: `acc11fe839c12cae38e31ce25870290b1c09199f`
- Result: **SUCCESS**

Local exact-candidate checks before push:

- Section 10 emergency regressions: **143/143 PASS**;
- whole Mobile Core regressions: **792/792 PASS**;
- TypeScript: **PASS**;
- lint: **PASS**;
- Expo Doctor: **21/21 PASS**;
- `git diff --check`: **PASS**.
### Security / Supply Chain

- tracked sensitive-file gate: **PASS**;
- worktree secret-signature scan: **PASS**;
- full Git-history secret-signature scan: **PASS**;
- dependency gate: **0 Critical / 0 High / 2 reviewed Moderate**.

The two reviewed Moderate advisories are transitive dependencies already visible to the whole-core gate:

- `uuid@7.0.3` through Expo config/xcode tooling;
- `decode-uri-component@0.2.2` through `expo-router -> query-string`.

They are not treated as Emergency Guardian authorization exceptions and do not widen runtime emergency authority.

### CodeQL

- Workflow: `CodeQL Security Analysis`
- Run number: `#619`
- Run ID: `36346111701`
- Head SHA: `acc11fe839c12cae38e31ce25870290b1c09199f`
- Result: **SUCCESS**
- JavaScript/TypeScript analysis: **PASS**

## Implemented Section 10 Controls

The accepted candidate includes:

- strict opt-in Emergency Guardian configuration and revision contracts;
- replay-safe emergency sessions bound to account, source device and config revision;
- exact-key emergency user events with monotonic sequencing and trusted receipt time;
- deterministic guardian state transitions with one-current-state semantics;
- stale issued state invalidation after every accepted state transition;
- responsiveness checks with trusted-time-derived deadlines;
- evidence contracts for user reports, motion, heart rate, ECG, oxygen, respiratory, microphone, camera, responsiveness and location;
- independent source authorization before evidence reaches risk fusion;
- current device trust, sensor policy and exact capability checks for evidence;
- evidence freshness recomputed from trusted evaluation time rather than cached status;
- deterministic non-diagnostic risk assessment;
- critical state requiring corroboration rather than a single weak/noisy signal;
- explicit urgent path for severe direct user reports without speculative diagnosis;
- deterministic escalation planning with no external side effects;
- trusted countdown enforcement through `actionNotBeforeMs`;
- authenticated manual escalation confirmation when automatic escalation is disabled;
- provider-neutral jurisdiction/platform emergency route descriptors;
- no globally hard-coded emergency number in the execution contract;
- independently scoped contact-notify and emergency-call capabilities;
- current trust and exact capability re-check immediately at action authorization time;
- trusted confirmation-event provenance before call authorization;
- simulation mode structurally denied by the action authorization layer;
- minimum-necessary emergency packet construction;
- independent exact capabilities before location or medical-profile references enter a packet;
- shared/public-surface emergency disclosure downgrade;
- private-audio requirement for detailed spoken emergency disclosure;
- typed sanitized emergency audit events without raw health/sensor/chat/credential payloads;
- zero inherited model, companion, sensor or proximity authority.

## Adversarial Evidence Highlights

Regression coverage proves at minimum:

- disabled Guardian cannot create actionable emergency flow;
- copied/forged sessions, state snapshots, plans, risk results and packets fail provenance checks;
- stale state snapshots cannot replay after cancellation or another transition;
- countdown cannot be bypassed by early action authorization;
- timeout cannot be forged by user-supplied time;
- historical evidence cannot masquerade as current critical evidence;
- unauthorized or revoked collectors cannot supply corroborating evidence;
- one weak physiological signal never becomes critical;
- conflicting evidence degrades confidence/state instead of inventing certainty;
- generic `device.control` or unrelated capability cannot substitute for emergency authority;
- contact grants cannot substitute for call grants and vice versa;
- wrong resource, expired or revoked grants fail closed;
- trust revocation after planning blocks later action authorization;
- raw boolean confirmation and copied approval objects cannot authorize an emergency call;
- one confirmation event cannot be rebound to another action/plan;
- jurisdiction/platform route mismatch fails closed;
- simulation cannot authorize a real contact/call side effect;
- hidden authority fields, URLs, credentials, scripts and raw medical payloads fail closed;
- packet over-disclosure is rejected;
- location and medical references require their own current exact capabilities;
- shared/public surfaces receive downgraded status without sensitive detail;
- call-confirmation events cannot rewrite responsiveness outcomes;
- manual escalation cannot proceed without a trusted `confirm_escalation` event.

## Closed Defects

See `docs/validation/SECTION_10_DEFECTS.md`.

No known unresolved Blocker, Critical or High Section 10 defect remains in the automated/pre-device scope at the accepted implementation candidate.

## Deferred Layer 4 / Production Obligations

Still mandatory before final production closure:

- real supported fall/motion and wearable-health inputs;
- real permission allow/deny/revoke flows;
- real voice/haptic responsiveness behavior;
- background/foreground and process/device restart recovery;
- local/offline critical-path behavior;
- real location retrieval and emergency-contact delivery using controlled test endpoints;
- platform/carrier emergency-call behavior using safe platform-provided test mechanisms;
- cancellation and race behavior under real OS scheduling;
- battery, latency and resource measurements;
- accessibility and multilingual emergency presentation;
- physical shared-screen/private-audio behavior;
- jurisdiction/platform legal review;
- regulatory/medical-device review before any diagnostic or medical-device claim;
- independent safety/security review appropriate to the released behavior.

No real emergency service or unsuspecting third party may be contacted as part of routine development validation.

## Acceptance Rule

Section 10 is accepted only at the pre-device level. Emergency Guardian may detect bounded risk, check responsiveness, prepare a minimal packet and authorize a permitted action only through current independent capabilities. It does not diagnose, infer authority from AI/sensors, or claim a real emergency side effect occurred without platform evidence.
