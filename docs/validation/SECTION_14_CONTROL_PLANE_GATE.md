# Section 14 — High-Assurance Control Plane Acceptance Gate

Status: FUTURE / SPECIFIED

Implementation is locked until preceding execution-plan sections permit it. This document defines the minimum evidence required to close Section 14 later.

Normative architecture:

- `docs/architecture/MUDRIK_REALTIME_CONTROL_PLANE.md`
- `docs/architecture/MUDRIK_COMPUTER_AUTONOMY.md`
- `docs/architecture/MUDRIK_SECURITY_BASELINE.md`
- `docs/architecture/MUDRIK_20_SECTION_EXECUTION_PLAN.md`

## Layer 1 — Specification / Static / Configuration

Required:

- [ ] versioned connection/task/event schemas;
- [ ] explicit trust boundaries;
- [ ] device/session identity model;
- [ ] TLS configuration reviewed;
- [ ] no plaintext transport fallback;
- [ ] cryptographic command-authentication design;
- [ ] replay window / nonce / sequence rules;
- [ ] durable task-state model;
- [ ] idempotency semantics;
- [ ] reconnect/resume semantics;
- [ ] revocation propagation design;
- [ ] broker/database consistency model;
- [ ] rate-limit/backpressure limits;
- [ ] RPO/RTO targets;
- [ ] privacy-safe telemetry schema;
- [ ] secrets/KMS architecture;
- [ ] Infrastructure-as-Code review;
- [ ] dependency/secret/configuration scans green.

## Layer 2 — Unit / Component Verification

Required deterministic tests:

- [ ] device challenge/proof success and failure;
- [ ] expired session rejection;
- [ ] revoked session rejection;
- [ ] invalid task signature rejection;
- [ ] expired task rejection;
- [ ] wrong destination rejection;
- [ ] unknown capability rejection;
- [ ] replayed nonce rejection;
- [ ] duplicate task ID idempotency;
- [ ] duplicate delivery does not create duplicate logical execution;
- [ ] sequence gap/recovery behavior;
- [ ] cancellation ordering;
- [ ] approval-state enforcement;
- [ ] rate-limit enforcement;
- [ ] payload-size enforcement;
- [ ] bounded retry/backoff behavior;
- [ ] backpressure behavior;
- [ ] protocol downgrade/unsupported-version rejection.

## Layer 3 — Integration / Security / Adversarial

Required:

- [ ] cross-account isolation;
- [ ] cross-device isolation;
- [ ] stolen/invalid bearer credential cannot impersonate permanent device trust without required device proof;
- [ ] replay attack simulation;
- [ ] out-of-order task/event simulation;
- [ ] delayed stale task does not execute after expiry;
- [ ] revoked device cannot reconnect;
- [ ] revoked grant blocks queued-but-not-executed privileged work where policy requires;
- [ ] forged approval reference rejected;
- [ ] gateway compromise simulation cannot directly bypass Agent capability checks;
- [ ] broker consumer redelivery remains idempotent;
- [ ] gateway restart loses no authoritative accepted task state;
- [ ] database transaction failure leaves coherent state;
- [ ] slow consumer cannot exhaust gateway/system memory;
- [ ] event flood protection;
- [ ] reconnect storm protection;
- [ ] DDoS/WAF/rate-limit configuration test;
- [ ] internal service identity/authorization negative tests;
- [ ] security logs redact credentials and unnecessary user content;
- [ ] malformed protocol fuzzing;
- [ ] penetration-test plan/review for externally reachable interfaces.

Critical and High security defects block closure.

## Layer 4 — Real Infrastructure / Failure / Load

Required production-like environment testing:

### Real-time connectivity

- [ ] persistent agent connection over real Internet;
- [ ] Wi-Fi -> cellular/mobile-hotspot transition where applicable;
- [ ] packet loss simulation;
- [ ] high-latency simulation;
- [ ] transient DNS failure;
- [ ] TLS connection interruption;
- [ ] gateway rolling restart;
- [ ] connection draining during deployment;
- [ ] reconnect to another healthy gateway;
- [ ] session resume without duplicate action.

### Durable delivery

- [ ] agent offline while task is queued;
- [ ] agent reconnect receives still-valid task exactly as defined by idempotent delivery semantics;
- [ ] expired offline task is not executed;
- [ ] broker restart/failover;
- [ ] duplicate/redelivered message handling;
- [ ] task state survives gateway restart;
- [ ] task state survives ordinary service-process restart;

### Database / recovery

- [ ] primary database failover where supported;
- [ ] encrypted backup created;
- [ ] backup restored into isolated environment;
- [ ] point-in-time recovery exercised where supported;
- [ ] restored device/task/approval integrity verified;
- [ ] migration rollback/recovery strategy tested;

### Load / latency

Representative load tests must record at minimum:

- [ ] connection establishment latency;
- [ ] authenticated command dispatch latency;
- [ ] acknowledgment latency;
- [ ] reconnect latency;
- [ ] p50;
- [ ] p95;
- [ ] p99;
- [ ] gateway CPU/memory;
- [ ] broker queue depth/redelivery;
- [ ] database saturation;
- [ ] error rate;
- [ ] revocation propagation time.

Initial healthy regional objective for an already connected/authorized destination:

- command dispatch should normally remain well below 250 ms server-side/regional target;
- p95/p99 must be explicitly measured and reviewed rather than hidden behind averages.

No unconditional Internet latency guarantee is claimed.

### Overload / degraded mode

- [ ] bounded queue behavior;
- [ ] slow-consumer handling;
- [ ] non-critical telemetry coalescing/shedding;
- [ ] cancel/revoke traffic remains available under ordinary overload target;
- [ ] circuit breaker behavior;
- [ ] dependency outage degrades safely;
- [ ] no runaway retry storm.

## Layer 5 — Release / Independent Evidence Gate

Required before Section 14 closes:

- [ ] exact release candidate identified by commit/build digest;
- [ ] all prior layers green on exact candidate;
- [ ] no Blocker/Critical/High unresolved within scope;
- [ ] final SAST/dependency/secret/config scans green;
- [ ] SBOM/provenance evidence where supported;
- [ ] signed deployment/release artifacts where applicable;
- [ ] staged/canary rollout path verified;
- [ ] rollback criteria tested;
- [ ] device/session/grant kill controls tested;
- [ ] database restore evidence recorded;
- [ ] security incident runbook exists;
- [ ] independent security review or penetration test completed/planned before broad public deployment;
- [ ] latency/load report retained;
- [ ] known limitations documented;
- [ ] status and architecture docs updated.

## Closure Rule

Section 14 is **not complete** because:

- a WebSocket connects;
- a demo command reaches an Agent;
- one server instance survives a test;
- average latency looks good;
- TLS is enabled;
- the cloud provider advertises high availability.

It closes only when the system proves authenticated, replay-safe, durable, idempotent, recoverable, observable, revocable, isolated, and performant behavior under representative failure and load conditions.
