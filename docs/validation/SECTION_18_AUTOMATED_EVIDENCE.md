# Section 18 — Automated Evidence

## Acceptance State

PRE-DEVICE COMPLETE — OPEN / REAL-PROVIDER LAYER 4 DEFERRED

This evidence closes the deterministic and automated pre-device obligations for Section 18 only. It does not claim production online provider integration, real local-model execution, production credential-vault lifecycle, measured production cost/latency/quality, real streaming outage recovery, or independent provider/privacy/security review.

## Accepted Candidate

- Branch: mudrik-core-v1
- Accepted implementation commit: 5b0f912692f3c815695bf57cc0b87a4faf19dd6f
- Accepted message: Build Section 18 intelligence router core

## Targeted Local Evidence

On the connected Pop!_OS development machine, the exact implementation candidate passed:

- frozen Yarn dependency install: PASS
- dependency blocking audit: 0 Critical / 0 High / 5 reviewed Moderate
- TypeScript: PASS
- ESLint: PASS
- Section 18 intelligence-router suite: 26/26 PASS
- whole Mobile Core regressions: 918/918 PASS
- Expo Doctor 1.20.4: 21/21 PASS
- Computer Agent regressions: 184/184 PASS
- Control Plane regressions: 59/59 PASS
- git diff --check: PASS

## GitHub Validation Evidence

### Mobile Core Validation

- Workflow: Mobile Core Validation
- Run number: 780
- Run ID: 36893366390
- Head SHA: 5b0f912692f3c815695bf57cc0b87a4faf19dd6f
- Result: SUCCESS

The hosted workflow executed frozen dependency installation, dependency reproducibility, Android build configuration, tracked sensitive-file gate, full Git-history secret scan, dependency High/Critical gate, reviewed advisory paths, lint, TypeScript, all Mobile Core security regressions, Expo Doctor, Computer Agent regressions and Control Plane regressions.

### CodeQL

- Workflow: CodeQL Security Analysis
- Run number: 676
- Run ID: 36893366679
- Head SHA: 5b0f912692f3c815695bf57cc0b87a4faf19dd6f
- Result: SUCCESS
- JavaScript/TypeScript analysis: PASS

## Implemented Section 18 Controls

The accepted candidate provides:

- provider-independent general/coding/vision/STT/TTS service vocabulary;
- strict provider/model registration contracts;
- explicit online/offline execution classification;
- internal credential references separated from public provider descriptors;
- versioned account/workspace routing policy;
- policy limits for enabled services, online services, optimization modes, fallback count, health age, latency, cost and quality;
- trusted-time validation for policy, health and route requests;
- monotonic provider-health updates and stale/future-health rejection;
- deterministic health/quality/latency/cost/offline routing;
- language, streaming and input-size eligibility checks before ranking;
- bounded primary + fallback route plans;
- request replay/idempotency conflict handling;
- registry-issued exact-object route-plan provenance;
- policy-revision invalidation of previously issued plans;
- adapter credential resolution only for currently issued/admitted/non-unavailable provider-model pairs;
- normalized provider failures with unsafe provider-message stripping;
- failover restricted to candidates admitted by the original route plan;
- non-retryable failure enforcement;
- no silent output mixing after observable output;
- explicit restart + generation rotation after output before provider failover;
- STT replay-buffer requirement after capture begins;
- provider-independent adapter invocation/output contracts;
- generation- and sequence-bound attempt tracking;
- duplicate output idempotency and sequence-conflict/gap rejection;
- late output rejection after policy invalidates an in-flight plan;
- strict result-envelope provider/model provenance;
- content-free privacy-safe intelligence audit contracts;
- zero execution, sensor, approval or capability authority on provider, route, adapter, output and result surfaces;
- explicit preservation of Sections 11/12 as final local execution authority.

## Adversarial Evidence Highlights

Regression coverage proves at minimum:

- unknown fields and malformed identifiers fail closed;
- online providers cannot expose credential references through public descriptors or route plans;
- offline providers reject credential bindings;
- true offline-only workspace policy is representable;
- request scope cannot widen routing policy limits;
- cross-policy revision binding fails;
- future policy, health and request timestamps fail closed against trusted time;
- stale or conflicting health updates fail closed;
- unavailable providers are excluded and cannot resolve adapter bindings;
- network loss and online denial remove online providers before ranking;
- quality, latency, cost, offline and balanced routing are deterministic;
- all five service classes use the same authority boundary;
- duplicate provider/model identities fail closed;
- copied route plans do not gain issued-plan provenance;
- route-plan identity, rank and service tampering fails;
- request-ID replay with changed routing intent fails;
- policy revision invalidates issued plan, adapter binding and later in-flight output;
- failover outside the original admitted candidate set fails;
- non-retryable permission/policy failures cannot be retried;
- output-observed failover without generation rotation fails;
- STT failover after capture without buffered input replay fails;
- adapter invocation/output cannot carry credentials or authority;
- output sequence gaps/conflicts and post-final output fail closed;
- result and audit envelopes reject hidden private/authority fields;
- provider failure messages with secret-shaped content are discarded.

## Closed Defects

See `docs/validation/SECTION_18_DEFECTS.md`.

No known unresolved Blocker, Critical or High Section 18 defect remains in the automated/pre-device scope at the accepted candidate.

## Deferred Layer 4 / Production Obligations

Before production closure Section 18 still requires:

- real online general/coding/vision providers;
- real STT and TTS providers;
- real local/offline models;
- production credential vault and key rotation/revocation;
- provider authentication and account lifecycle;
- network loss during active streaming;
- real provider timeout/rate-limit/outage behavior;
- measured latency/cost/quality calibration;
- provider billing/cost guardrails;
- local CPU/GPU/RAM/battery/thermal pressure;
- large/concurrent multi-provider workloads;
- production provider result-data retention/privacy settings;
- data-residency/regulatory review where applicable;
- real-provider prompt/output privacy review;
- independent security review.

## Acceptance Rule

Section 18 is accepted at the pre-device level on the exact implementation SHA above. Provider/model output remains untrusted and non-authoritative. Production closure remains deferred to real-provider validation and the Section 20 whole-system release gate.
