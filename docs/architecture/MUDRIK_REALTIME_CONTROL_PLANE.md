# MUDRIK High-Assurance Real-Time Control Plane

Status: Accepted architectural requirement — 2026-09-12

## Purpose

MUDRIK must not rely on an ordinary request/response backend for remote control, Computer Agent coordination, approvals, device presence, or other latency-sensitive control traffic.

The production communication layer is a **high-assurance, low-latency, durable Control Plane** designed for strong security, rapid recovery, predictable delivery semantics, and fault containment.

This document defines the target architecture. It does **not** authorize coupling production server transport into the Mobile Core before `MOBILE-CORE-FROZEN`.

## Product Requirement

The user-visible behavior should feel immediate while preserving security and correctness.

Target properties:

- persistent real-time sessions rather than repeated polling for ordinary control traffic;
- low perceived command latency under healthy network conditions;
- rapid reconnect after Wi-Fi/cellular changes;
- no silent duplicate execution after reconnect/retry;
- durable task delivery when the destination agent temporarily disconnects;
- cryptographically authenticated device identity;
- cryptographically authenticated sensitive command envelopes in addition to transport encryption;
- strong account/device isolation;
- immediate revocation capability;
- bounded, observable degradation during partial failures;
- no unauthenticated inbound shell or exposed raw Computer Agent port;
- horizontal scalability without weakening authorization boundaries.

## Non-Negotiable Design Rule

MUDRIK does not equate "real-time" with "fire-and-forget" and does not equate "encrypted transport" with "trusted command".

A command may be delivered quickly only after the required identity, authorization, freshness, replay, scope, and risk checks pass.

## High-Level Topology

```text
Mobile / Web
     |
     | HTTPS + persistent real-time channel
     v
Edge / DDoS / WAF / Rate-Limit Layer
     |
     v
Regional Real-Time Gateway Pool
     |
     +----> Identity / Session Verification
     +----> Device Presence / Connection Registry
     +----> Approval Service
     +----> Command Authentication / Policy Boundary
     |
     v
Durable Event / Task Bus
     |
     +----> Task State Service ----> Primary Durable Database
     +----> Audit Service ---------> Append-oriented Security Audit Store
     +----> Notification Service
     |
     v
Regional Gateway Pool
     |
     | outbound authenticated persistent connection
     v
MUDRIK Computer Agent
     |
     v
Local Capability / Permission Engine
     |
     v
Approved Local Tools
```

The Control Plane routes and persists work. It does not inherit permission to execute local operating-system actions.

## Connection Model

### Agent connection

The Computer Agent initiates an **outbound** authenticated persistent connection to the Control Plane.

Production baseline:

- TLS 1.3 where supported by the deployed stack;
- HTTPS/WSS only, with no plaintext fallback;
- server certificate validation;
- device proof bound to a registered device key;
- short-lived session credentials;
- heartbeat/liveness detection;
- jittered exponential reconnect backoff;
- connection resume metadata;
- bounded retry loops;
- immediate disconnect on revocation or invalid identity proof.

WebSocket is an acceptable baseline transport for the first production implementation because it is widely supported and appropriate for bidirectional low-latency control traffic.

The protocol must remain transport-abstracted so a later QUIC/WebTransport implementation can be introduced where it produces measurable reliability or latency benefits without rewriting task semantics.

### Mobile/Web connection

Mobile and Web connect only to authenticated Control Plane endpoints. They never connect directly to an unrestricted Computer Agent endpoint over the public Internet.

## Device Authentication

Every paired Computer Agent has an independent cryptographic device identity.

Preferred flow:

1. generate the device key pair locally;
2. protect the private key using OS/hardware-backed secure storage where available;
3. register only the public identity material with the Control Plane;
4. authenticate a new transport session using a server challenge plus device proof;
5. issue a short-lived, device-bound session credential after successful verification;
6. rotate credentials without rotating the permanent device identity for every reconnect;
7. support explicit key rotation and complete device revocation.

A bearer token alone is not sufficient to represent permanent device trust.

## Command Authenticity

Sensitive task/command envelopes are authenticated independently from TLS.

An authenticated task envelope should contain at minimum:

- protocol version;
- task ID;
- account/user ID;
- issuing session/device ID;
- destination device ID;
- issued-at timestamp;
- expiration timestamp;
- nonce;
- monotonic or replay-window sequence value where applicable;
- requested capability IDs;
- workspace/resource scope;
- approval reference where required;
- payload digest;
- cryptographic signature or verifiable MAC according to the final protocol design.

The receiver rejects the envelope if any identity, freshness, signature, destination, scope, capability, approval, or replay check fails.

## Replay and Duplicate Protection

Distributed delivery must assume retries and duplicates can occur.

MUDRIK must use:

- globally unique task/message IDs;
- one-use nonces for sensitive commands;
- bounded replay windows;
- expiry timestamps;
- destination binding;
- server-side and agent-side consumed-message tracking;
- idempotency keys for mutating operations;
- durable task state transitions;
- sequence-aware event recovery.

The system must **not** promise impossible network-level "exactly once" delivery.

Instead, it should use durable at-least-once delivery where required plus idempotent consumers/state transitions so the observable action is executed once within the defined safety model.

## Durable Task Delivery

Task state is not stored only in a WebSocket process or in-memory connection map.

A task accepted by the Control Plane must have a durable record before it can be considered queued.

Target lifecycle:

`received -> authenticated -> authorized/awaiting_approval -> queued -> delivered -> acknowledged -> running -> blocked | succeeded | failed | cancelled`

Key rules:

- a disconnected agent does not lose an already accepted durable task;
- reconnect does not create a second logical task;
- delivery acknowledgment is distinct from execution success;
- the server can recover task state after process restart;
- the agent persists accepted autonomous tasks locally before execution;
- cancellation/revocation events have explicit ordering and acknowledgement semantics;
- expired tasks never execute merely because connectivity returns later.

## Messaging Backbone

The production Control Plane should use a durable messaging/event system suitable for low-latency fan-out and replay-safe consumers rather than coupling all state to individual gateway processes.

A strong initial candidate is **NATS JetStream** or an equivalently capable durable event backbone, provided production benchmarks and failure tests validate it for the final workload.

The architecture must preserve an abstraction around the broker so implementation choice can change without changing the public task protocol.

Required broker properties:

- durable streams/consumer state;
- explicit acknowledgements;
- bounded redelivery;
- consumer isolation;
- backpressure;
- retention limits;
- replay for recovery;
- observability;
- cluster replication appropriate to the deployment tier.

## Durable Datastore

Authoritative account/device/task/approval state should live in a transactional durable database rather than an ephemeral cache.

A strong baseline is PostgreSQL with:

- transactional integrity;
- strict constraints;
- migration discipline;
- encrypted transport;
- encrypted managed storage where available;
- point-in-time recovery;
- tested backup restore;
- read replicas only where consistency requirements permit;
- high-availability failover appropriate to production scale.

Redis or an equivalent in-memory system may be used for ephemeral presence, rate-limit counters, short replay caches, or hot session metadata, but it must not become the sole source of truth for durable tasks/approvals.

## Regional Gateway Layer

Real-time gateways should be stateless or minimally stateful so a connection can move between healthy instances.

Target properties:

- multiple gateway instances per active region;
- load balancing with health-aware routing;
- connection draining for deployment;
- bounded per-connection memory;
- per-account/device connection limits;
- heartbeat timeout and dead-session cleanup;
- reconnect/resume support;
- backpressure and slow-consumer protection;
- no permanent task truth stored only in gateway RAM.

For larger deployment, multiple regions should be supported with explicit home-region/ownership rules for strongly ordered device sessions, rather than uncontrolled active-active writes to the same task state.

## Latency Objectives

Performance must be measured end-to-end, not inferred from infrastructure marketing claims.

Initial engineering objectives for healthy regional conditions:

- gateway ingress/authenticated routing overhead: low tens of milliseconds where infrastructure permits;
- command dispatch from accepted/authorized server state to an already-connected agent: typically well below 250 ms regional target;
- presence/heartbeat detection tuned to avoid both false disconnects and long stale-online states;
- reconnect after ordinary network change: as fast as safely possible, normally seconds rather than minutes;
- user-visible progress events streamed incrementally rather than waiting for task completion.

These are engineering objectives, not unconditional guarantees. Physical radio latency, provider outages, OS background limits, and Internet routing remain external variables.

Every production release should record p50/p95/p99 latency rather than relying only on averages.

## Availability and Failure Containment

The Control Plane must tolerate single-process and ordinary single-node failures without losing authoritative task state.

Required controls:

- health checks and automatic instance replacement;
- replicated durable state;
- circuit breakers;
- bounded retries with jitter;
- queue backpressure;
- overload shedding for non-critical traffic;
- priority separation for control/cancel/revoke traffic;
- per-tenant isolation where practical;
- graceful degraded mode;
- disaster-recovery plan;
- backup restore exercises;
- region failover design before claiming multi-region availability.

Cancellation, revocation, and security-control events should have higher operational priority than ordinary progress telemetry.

## Security Perimeter

The Internet-facing edge should provide layered protections such as:

- DDoS absorption/protection;
- WAF/API abuse controls;
- request/body size limits;
- connection-rate limits;
- per-IP abuse heuristics without treating IP as identity;
- per-account and per-device quotas;
- TLS termination under controlled configuration;
- strict origin policy for Web clients;
- bot/credential-stuffing protections on authentication endpoints;
- no direct public exposure of databases, brokers, or internal service ports.

Internal services must not trust a request merely because it came from the private network.

## Zero-Trust Service Communication

Internal service-to-service calls should use authenticated workload identity.

Target controls include:

- separate service identities;
- short-lived credentials/certificates;
- mTLS or equivalent authenticated service transport where practical;
- least-privilege network/service policies;
- independent authorization checks on privileged operations;
- secret-manager-backed credentials;
- key/certificate rotation;
- no shared master service credential across the platform.

## Selective End-to-End Payload Protection

TLS protects transport hops, but some payload classes may require stronger confidentiality from intermediary services.

The protocol should support optional application-layer encryption to a destination device public key for payloads that the routing layer does not need to inspect.

Metadata required for safe routing/authorization may remain server-visible, but sensitive payload content should be minimized.

This feature must be designed with recoverability, multi-device routing, key rotation, and approval inspection in mind; encryption must not make security policy unverifiable.

## Authorization Boundary

Authentication to the Control Plane does not imply authority to issue arbitrary agent commands.

Every mutating request passes through deterministic authorization that verifies:

- account ownership/membership;
- source session/device;
- destination device ownership;
- declared capability;
- scope;
- approval requirements;
- task risk class;
- policy version;
- revocation state;
- rate/resource limits.

The AI model is never the authorization authority.

## Revocation and Kill Controls

Production must support fast revocation of:

- user sessions;
- refresh credentials;
- paired devices;
- device keys;
- active real-time sessions;
- grants/capabilities;
- pending tasks;
- compromised agent/app versions;
- integrations.

A kill/revoke event must not wait behind ordinary low-priority task telemetry.

## Rate Limiting and Abuse Resistance

Rate limits are layered and contextual:

- IP/network edge limits;
- account limits;
- device limits;
- session limits;
- endpoint limits;
- task creation limits;
- event/output limits;
- concurrent task limits;
- expensive tool/provider budget limits.

Security-sensitive endpoints use stricter limits and anomaly detection.

The system must protect itself from event storms, recursive agent loops, reconnect storms, oversized outputs, and malicious clients.

## Backpressure

A slow browser, mobile device, agent, broker consumer, or downstream service must not exhaust the entire system.

Required behavior:

- bounded queues;
- flow control;
- event coalescing for non-critical high-frequency telemetry;
- maximum payload sizes;
- maximum unacknowledged message counts;
- slow-consumer disconnect/degrade policy;
- durable summary state so dropping non-critical intermediate progress does not lose final task truth.

## Presence Semantics

"Online" must have a precise meaning.

Suggested states:

- `online`: authenticated heartbeat/session currently healthy;
- `degraded`: session exists but latency/loss/backpressure is outside healthy threshold;
- `reconnecting`: recent authenticated session lost and resume window remains open;
- `offline`: no valid live session;
- `revoked`: identity intentionally blocked.

Presence is advisory UI state and does not replace command authorization.

## Observability

Production operation requires correlated telemetry across the full command path.

Each request/task should carry a trace/correlation ID distinct from secrets.

Measure at minimum:

- connection count;
- reconnect rate;
- authentication failures;
- replay rejection;
- task queue depth;
- delivery latency;
- acknowledgment latency;
- execution start latency;
- completion latency;
- p50/p95/p99 latency;
- redelivery count;
- dropped/coalesced telemetry;
- broker/database saturation;
- error rates by service/region/version;
- revocation propagation time.

Logs must redact secrets and minimize user content.

Metrics, traces, and logs must not become a second unprotected copy of private data.

## Audit Trail

Security-sensitive state changes require append-oriented audit events, including:

- sign-in/session creation;
- device pairing and revocation;
- key rotation;
- permission/grant changes;
- approval creation/use/rejection;
- high/critical command acceptance;
- replay rejection;
- administrative security action;
- compromised-version block;
- emergency kill/revoke.

Audit records should be tamper-evident or backed by controls that make unauthorized alteration detectable.

## Deployment and Supply-Chain Requirements

The Control Plane is security-critical infrastructure.

Production expectations:

- infrastructure as code;
- isolated environments;
- least-privilege cloud/IAM roles;
- no manually shared production passwords;
- secret manager / KMS;
- signed/provenance-backed build artifacts where feasible;
- dependency/SBOM/security scanning;
- protected deployment credentials;
- staged/canary deployment;
- health-based rollback;
- database migration safety checks;
- immutable or reproducible deployment artifacts where practical.

## Database and Broker Backup/Recovery

Backups are not considered valid merely because they exist.

Required exercises:

- scheduled encrypted backups;
- point-in-time recovery where supported;
- restore into isolated environment;
- verify restored task/device/account integrity;
- broker-state recovery test where durable broker state is relied upon;
- documented RPO/RTO targets before production SLA claims;
- disaster simulation before broad production release.

## Protocol Versioning

Every connection/task/event protocol must be versioned.

Rules:

- explicit protocol version negotiation;
- compatibility window;
- server ability to reject dangerously old clients;
- agent ability to reject unsupported future commands;
- schema validation before authorization/execution;
- signed update path for agents that must upgrade;
- no silent interpretation of unknown capability IDs.

## Testing Requirements

Before production release, the Control Plane requires more than unit tests.

Required test classes include:

- malformed protocol fuzzing;
- auth bypass tests;
- cross-account/cross-device isolation;
- replay and duplicate delivery;
- expired task rejection;
- revoked-session/device rejection;
- reconnect storm/load testing;
- gateway crash during delivery;
- broker restart/failover;
- database failover/restore;
- duplicate delivery with idempotent execution;
- delayed/out-of-order event handling;
- slow consumer/backpressure;
- network partition simulation;
- packet loss/high-latency simulation;
- cancellation/revocation race conditions;
- abuse/rate-limit tests;
- penetration testing before major production launch.

## Security and Reliability Release Gate

The production Control Plane does not ship merely because a WebSocket connection works.

Section 14 cannot close until evidence proves:

1. authenticated device/session establishment;
2. no plaintext fallback;
3. command authentication and replay rejection;
4. durable accepted-task persistence;
5. idempotent retry/redelivery semantics;
6. reconnect/resume without duplicate action;
7. revocation propagation;
8. cross-account/device isolation;
9. bounded overload/backpressure behavior;
10. failure recovery from gateway/process restart;
11. tested database backup/restore;
12. measured p50/p95/p99 latency under representative load;
13. green security/adversarial test suite;
14. independent security review/penetration-test plan before broad release.

## Initial Production Stack Direction

This is an architectural direction, not an irreversible vendor lock-in:

- edge/DDoS/WAF: reputable managed edge provider;
- real-time gateway: horizontally scalable service using persistent WebSocket initially;
- service runtime: containerized or equivalent isolated deployment;
- durable database: PostgreSQL;
- durable low-latency event bus: NATS JetStream or equivalent after benchmark/failure validation;
- ephemeral cache/rate-limit/presence: Redis or equivalent, never sole durable task truth;
- secrets/keys: managed KMS + secret manager;
- observability: metrics + traces + privacy-safe structured logs;
- deployment: IaC + staged/canary release + automated rollback criteria.

Technology may change if measurements show a better option, but the security, durability, ordering, idempotency, recovery, and observability requirements do not weaken.

## Relationship to Mobile Core

This architecture is documented now so later sections are not underspecified.

It must **not** be coupled into the current Mobile Core runtime while Section 1 is still active.

Implementation belongs primarily to:

- Section 2 — Platform Security Foundation;
- Section 3 — Account Identity, Authentication and Device Trust;
- Section 11 — Durable Computer Agent Runtime;
- Section 14 — Control Plane and Reliable Task Routing;
- Section 15 — Web and Mobile Command Surfaces;
- Section 20 — Whole-System Integration and Production Release Gate.

## Core Rule

**Fast transport is never allowed to outrun authorization, and strong authorization is never allowed to make delivery fragile.**

MUDRIK's server/control path must be simultaneously low-latency, authenticated, durable, replay-safe, observable, recoverable, and independently revocable.
