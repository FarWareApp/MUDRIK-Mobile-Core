# Section 18 — Intelligence Router and Model/Provider Layer Gate

## Status

`PRE-DEVICE IMPLEMENTATION — ACTIVE`

## Target Boundary

`Task Intent -> Strict Intelligence Request -> Provider Registry + Health -> Deterministic Route Plan -> Provider Adapter -> Untrusted Result Envelope`

Authoritative architecture:

- `docs/architecture/MUDRIK_INTELLIGENCE_ROUTER.md`
- `docs/architecture/MUDRIK_SECURITY_BASELINE.md`
- `docs/architecture/MUDRIK_20_SECTION_EXECUTION_PLAN.md`

## Scope

- general/coding/vision/STT/TTS provider abstraction;
- offline/online provider classification;
- provider/model registration and public descriptor separation;
- versioned account/workspace routing policy;
- health/latency/cost/quality-aware deterministic routing;
- bounded fallback plans;
- outage/failure normalization and output-mixing-safe failover;
- adapter-private credential references;
- provider-independent MUDRIK identity;
- non-authoritative result envelopes and privacy-safe route audit.
## Core Invariants

1. MUDRIK identity never depends on a provider/model.
2. Online providers require explicit online permission and network availability.
3. Offline providers never require a credential reference.
4. Online credential references never enter public descriptors, route plans, result envelopes or audit records.
5. Raw secret/API-key material is rejected by Section 18 contracts.
6. Health is explicit, monotonic and time-bounded.
7. Service, streaming, language, input-size, quality, latency and cost constraints are enforced before ranking.
8. Routing is deterministic for identical accepted state.
9. Route plans contain one primary and bounded ordered fallbacks.
10. Failover can target only candidates admitted in the original plan.
11. Non-retryable failures cannot trigger failover.
12. Output from different providers is never silently mixed.
13. Failover after output requires explicit restart and generation rotation.
14. STT failover after input begins requires replayable buffered input.
15. Provider output remains non-authoritative.
16. Provider switching cannot mutate Section 16 memory or Section 17 knowledge truth.
17. Audit contains stable IDs/reason codes, not prompt/output/credential content.
18. Issued plans are registry-provenance-bound and invalidated by policy revision.
19. Attempt output is sequence/generation-bound and late output after plan invalidation fails closed.
20. Section 11/12 remain final local execution authority.

## Layer 1–3 Required Evidence

Strict provider, health, request, route-plan, failover, result and audit contracts; credential isolation; offline/online rules; deterministic routing; bounded fallbacks; stale/unavailable health rejection; cost/latency/quality constraints; outage/failover cases; credential injection rejection; output-mixing prevention; provider switching preserving durable truth; type/lint/dependency/secret gates green.
## Layer 4 — Real Environment / Failure / Performance

**DEFERRED** under the owner-directed real-environment exception.

Before production closure validate real online/local model providers, real STT/TTS/vision adapters, credential vault/key rotation/revocation, network loss during streaming, provider rate limits/outages/timeouts, measured cost/latency/quality calibration, local model CPU/GPU/RAM pressure, concurrency/load, billing guardrails, privacy/data-residency review and independent security review.

## Layer 5 — Evidence / Release Gate

Pre-device completion requires an exact accepted candidate SHA, Section 18 deterministic/component/adversarial tests green, whole Mobile Core regressions green, Computer Agent and Control Plane regressions green, Mobile Core Validation green, CodeQL green, dependency and secret gates green, no unresolved Blocker/Critical/High Section 18 defect, automated evidence and defect record, and all real-environment obligations explicitly deferred.
