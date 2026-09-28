# Section 14 — Control Plane and Reliable Task Routing Gate

## Status

`PRE-DEVICE IMPLEMENTATION — ACTIVE`

Section 14 implements the deterministic and durable Control Plane core without coupling production transport into the Mobile Core. Real WebSocket infrastructure, broker/database deployment, multi-region behavior and production credentials remain real-environment work.

## Authoritative Architecture

- `docs/architecture/MUDRIK_REALTIME_CONTROL_PLANE.md`
- `docs/architecture/MUDRIK_CONTROL_PLANE_THREAT_MODEL.md`
- `docs/architecture/MUDRIK_COMPUTER_AUTONOMY.md`
- `docs/architecture/MUDRIK_SECURITY_ASSURANCE_PROGRAM.md`
- `docs/architecture/MUDRIK_20_SECTION_EXECUTION_PLAN.md`
- `docs/validation/SECTION_03_IDENTITY_AUTH_DEVICE_TRUST_GATE.md`
- `docs/validation/SECTION_11_DURABLE_COMPUTER_AGENT_GATE.md`
- `docs/validation/SECTION_12_COMPUTER_AGENT_TOOLING_SANDBOX_GATE.md`

Target boundary:

`Authenticated Source Session + Trusted Device Registry -> Durable Command Admission -> Approval/Authorization -> Ordered Route State -> At-Least-Once Delivery -> Agent Ack/Event Reconciliation -> Terminal State + Audit`

## Scope

- authenticated device registry state;
- device/session ownership binding;
- outbound-agent connection/session contracts;
- versioned command/task routing envelope;
- durable accepted-task state;
- approval records and one-shot consumption semantics;
- ordered task/event sequencing;
- replay/duplicate protection;
- reconnect/resume cursor semantics;
- at-least-once delivery with idempotent logical task identity;
- delivery acknowledgement distinct from execution completion;
- cancellation/revocation ordering;
- kill/revoke priority semantics;
- bounded presence/liveness state;
- privacy-minimized audit events;
- persistence interfaces suitable for transactional storage;
- broker/gateway abstractions that do not own authorization truth.

## Explicit Non-Goals

- no production Internet-facing gateway deployment;
- no production WebSocket credentials or TLS private keys;
- no NATS/PostgreSQL/Redis production coupling yet;
- no browser/mobile command UI implementation; Section 15 owns those surfaces;
- no AI/model authorization;
- no direct public Computer Agent port;
- no server-side bypass of Section 11/12 local task admission or capability policy;
- no claim of network-level exactly-once delivery;
- no multi-region HA claim before real infrastructure testing;
- no production SLA/latency claim before measured Layer 4 load testing.

## Core Invariants

1. Device IDs, names, IP addresses, LAN proximity and connection presence are never authentication.
2. An active Control Plane device record must be bound to an account and verified Section 3 device identity.
3. A user/session may route only to devices owned by the same authorized account unless an explicit future sharing policy says otherwise.
4. Unknown/revoked/suspended/rotation-required devices fail closed.
5. A task is not queued until its authoritative durable record exists.
6. Transport/gateway/broker state is not authorization truth.
7. Every logical task has one immutable task ID and destination binding.
8. Duplicate delivery may be idempotent; conflicting reuse of an ID fails closed.
9. Nonces, expiry and sequence/replay windows are independently validated.
10. Reconnect/resume cannot mint a new logical task or reset a terminal task.
11. Delivery acknowledgement is distinct from execution-start and execution-completion.
12. Event sequence advances monotonically; stale/conflicting sequence values fail closed.
13. Late events cannot overwrite a terminal cancelled/revoked/failed/succeeded state incorrectly.
14. Cancel/revoke ordering takes precedence over ordinary progress/delivery traffic.
15. Revocation state is checked at task admission, routing and defined pre-delivery checkpoints.
16. Approval records are bound to account, session/device, task, capability/scope/risk, expiry and policy version.
17. One-shot approval consumption is atomic/idempotent and cannot be rebound to another task.
18. Control Plane authorization never creates a local Section 11/12 capability grant.
19. An authenticated envelope delivered by the Control Plane must still pass Computer Agent admission and local policy.
20. Presence is advisory state only and never creates command authority.
21. Liveness state has bounded trusted-time semantics and stale presence becomes degraded/offline rather than trusted.
22. Payloads, task metadata, events and queues are bounded.
23. Slow consumers receive bounded/coalesced non-critical telemetry rather than unbounded memory growth.
24. Reconnect uses bounded exponential backoff with deterministic jitter input or testable jitter abstraction.
25. Protocol versions are explicit and unsupported major versions fail closed.
26. Security/audit records contain stable IDs/reason codes rather than secrets or arbitrary private payloads.
27. No unauthenticated inbound shell/control endpoint is introduced.
28. Control-plane failures must not silently broaden account/device/capability scope.
29. Database/broker adapter failures fail toward durable uncertainty/retry, not fabricated success.
30. Same accepted state plus same ordered input produces deterministic task-state output.

## Layer 1 — Specification / Static Correctness

Required evidence:

- strict versioned runtime contracts;
- exact account/session/device/task/approval identifiers;
- deterministic task and delivery lifecycle;
- exact event sequence rules;
- approval binding/consumption rules;
- revoke/cancel ordering rules;
- bounded presence/reconnect/backpressure configuration;
- durable repository interfaces with transactional/CAS semantics;
- typed privacy-safe audit contract;
- syntax/type/lint/dependency/secret gates green.

## Layer 2 — Unit / Component Verification

Mandatory cases include:

- valid same-account route accepted;
- cross-account/cross-device route rejected;
- invalid/revoked device rejected;
- invalid/expired/revoked source session rejected;
- duplicate task delivery idempotent;
- task-ID conflict rejected;
- nonce replay rejected;
- stale/expired task rejected;
- approval exact binding and one-shot replay;
- event monotonic sequence;
- duplicate event idempotency;
- conflicting same-sequence event rejection;
- terminal-state overwrite rejection;
- cancel/revoke idempotency;
- presence expiry/degradation;
- reconnect cursor validation;
- queue and payload bounds.

## Layer 3 — Integration / Security / Adversarial Verification

Mandatory cases include:

- stolen/cross-account session routing attempt;
- copied device metadata without trusted identity;
- broker duplicate/reorder/injection simulation;
- reconnect after missed delivery without duplicate logical execution;
- gateway restart with durable task truth preserved;
- delivery ack followed by disconnect before execution completion;
- cancellation racing delivery/ack/running events;
- device/session revocation racing reconnect;
- forged/reused approval;
- stale resume cursor;
- malicious future/old sequence values;
- slow-consumer/event-flood/backpressure tests;
- payload/metadata secret injection tests;
- malformed protocol fuzz cases;
- local Agent still rejects a server-routed task that violates its own admission/policy.

## Layer 4 — Real Infrastructure / Recovery Verification

**DEFERRED** under the owner-directed real-environment exception.

Before production closure validate at minimum:

- real TLS/WSS persistent sessions with no plaintext fallback;
- real device challenge/proof and short-lived connection sessions;
- real PostgreSQL transactional persistence and migrations;
- real durable broker redelivery/ack/restart behavior;
- Redis/presence role only where not authoritative;
- gateway crash/restart/drain behavior;
- network partition, packet loss and reconnect storms;
- slow consumers and backpressure under load;
- database failover and isolated backup/restore;
- broker failure/recovery;
- revocation propagation latency;
- p50/p95/p99 delivery/ack latency;
- multi-instance and future multi-region ownership rules;
- DDoS/rate-limit/abuse controls;
- production KMS/secret-manager/service identity;
- independent penetration/security review.

## Layer 5 — Evidence / Release Gate

Pre-device completion requires:

- exact accepted candidate SHA;
- Control Plane deterministic tests green;
- Computer Agent regressions green;
- whole Mobile Core regressions green;
- Mobile Core Validation green;
- CodeQL green;
- dependency and secret gates green;
- no unresolved Blocker/Critical/High Section 14 defect;
- automated evidence and defect record;
- all unavailable infrastructure guarantees explicitly deferred.

## Acceptance Rule

Section 14 is pre-device complete only when routing, approval, sequencing, replay, reconnect, revocation and persistence semantics are deterministic and adversarially tested without weakening Sections 3, 11 or 12. Fast transport never outruns authorization, and durable delivery never implies duplicate authority.
