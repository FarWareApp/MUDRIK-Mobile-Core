# MUDRIK Control Plane Threat Model

Status: Accepted security design input — 2026-09-12

This threat model applies to the future high-assurance real-time Control Plane defined by `MUDRIK_REALTIME_CONTROL_PLANE.md`.

It is documentation only while Section 1 remains active. It does not authorize production server coupling into Mobile Core.

## Security Objective

A compromise, malformed request, network failure, stolen credential, replay, overloaded component, or malicious device must not silently broaden authority across users, devices, capabilities, or local operating-system resources.

The Control Plane must preserve:

- authentication;
- authorization;
- confidentiality;
- integrity;
- replay resistance;
- task-state correctness;
- availability under bounded abuse/failure;
- revocation;
- auditability;
- privacy minimization;
- fault containment.

## Primary Assets

High-value assets include:

- account/session credentials;
- device public identities and registration state;
- device private keys on endpoints;
- pairing state;
- task/command envelopes;
- approval records;
- capability grants;
- task lifecycle state;
- local workspace scope metadata;
- cancellation/revocation state;
- secrets references;
- audit records;
- user/device routing metadata;
- server signing/key material;
- deployment credentials;
- database and broker state;
- security telemetry.

No single asset should function as a universal master credential across the platform.

## Trust Boundaries

Explicit boundaries:

1. Public Internet -> Edge layer.
2. Edge layer -> Real-Time Gateway.
3. Gateway -> Identity/Session services.
4. Gateway -> Durable broker.
5. Services -> Durable database.
6. Service -> service internal calls.
7. Control Plane -> Computer Agent persistent channel.
8. Computer Agent -> local capability/policy engine.
9. Capability engine -> local tools/OS.
10. Mobile/Web -> authenticated Control Plane API/session.
11. CI/CD -> production infrastructure.
12. Operators/admins -> privileged production controls.

Crossing a boundary requires explicit authentication and authorization appropriate to that boundary. Network location alone is never sufficient trust.

## Threat Actors

Assume attackers may include:

- unauthenticated Internet attacker;
- credential-stuffing attacker;
- user with a valid account attacking another account;
- compromised browser session;
- stolen mobile session;
- compromised paired computer;
- malware running beside the Computer Agent;
- malicious or compromised third-party integration;
- malicious input embedded in project/files/web content;
- compromised service instance;
- compromised dependency/build artifact;
- insider with partial infrastructure access;
- botnet attempting resource exhaustion;
- attacker capable of replaying captured traffic or messages.

The design must also tolerate non-malicious failures that resemble attacks: duplicate delivery, reordered events, clocks drifting within expected bounds, process restarts, stale sessions, network partitions, and partial outages.

## Threat: Credential Theft

### Attack

An attacker steals a web/mobile access token or session credential.

### Controls

- short-lived access credentials;
- refresh rotation/reuse detection where applicable;
- secure cookies/platform secure storage;
- session/device inventory;
- remote revocation;
- step-up authentication for sensitive actions;
- device-bound proof for permanent Computer Agent identity;
- rate/anomaly detection;
- no permanent device trust based only on bearer token.

### Residual rule

A stolen normal user session must not automatically become a permanent Computer Agent identity or grant `system.admin`.

## Threat: Device Impersonation

### Attack

An attacker claims a known device ID or copies public metadata.

### Controls

- per-device asymmetric identity;
- server challenge signed/proved by device private key;
- private key retained locally;
- hardware/OS-backed key protection where available;
- key rotation/revocation;
- short-lived device session after proof;
- destination binding on task envelopes.

Device names/UUID strings are not authentication.

## Threat: Replay Attack

### Attack

A previously valid high-impact command is resent.

### Controls

- unique task/message ID;
- nonce;
- issued-at/expiry;
- sequence/replay window;
- consumed-message state;
- destination binding;
- command signature/MAC;
- idempotent state transition;
- local Agent replay cache/persisted task identity.

A valid historical signature is insufficient if the envelope is stale or already consumed.

## Threat: Duplicate Delivery

### Attack/failure

Broker/network retry redelivers the same task.

### Controls

- durable task ID;
- idempotency key;
- local persisted accepted-task state;
- compare-and-set/transactional task transitions;
- side-effect deduplication where technically feasible;
- acknowledgement distinct from execution completion.

MUDRIK does not claim impossible network-level exactly-once delivery.

## Threat: Cross-Account or Cross-Device Routing

### Attack

A valid user manipulates routing identifiers to send commands to another user's device.

### Controls

- authorization derives destination ownership from trusted server state, not request claims alone;
- account/device binding enforced transactionally;
- destination device included in authenticated envelope;
- cross-account negative tests;
- opaque identifiers are not treated as authorization;
- audit repeated denied routing attempts.

## Threat: Capability Escalation

### Attack

A task requests undeclared/more privileged local capabilities than the user approved.

### Controls

- versioned capability registry;
- default-deny unknown capability;
- signed declared capabilities/scope;
- server authorization boundary;
- Computer Agent independent local policy check;
- per-step re-authorization;
- critical actions fresh approval;
- AI/model cannot create grants.

A compromised Control Plane component must still face the local Agent capability boundary.

## Threat: Approval Forgery or Reuse

### Attack

An attacker invents an approval ID or reuses an approval for a different task/scope.

### Controls

- approval record bound to account, device, task, capability scope, risk class, expiry, and policy version;
- one-shot approvals consumed atomically where required;
- no client-supplied approval truth without server verification;
- critical approval requires recent authentication;
- approval reuse logged/rejected.

## Threat: Man-in-the-Middle

### Attack

Network attacker intercepts/modifies traffic.

### Controls

- TLS 1.3 where supported;
- strict certificate validation;
- no plaintext fallback;
- HSTS for applicable web origins;
- command authentication independent of TLS;
- secure certificate/key rotation;
- optional safe pinning only with robust rotation/recovery;
- application-level destination/signature verification for sensitive tasks.

## Threat: Compromised Gateway

### Attack

A real-time gateway process is compromised.

### Controls

- gateway stores no permanent task truth only in RAM;
- minimal service identity/permissions;
- no database superuser credential;
- command/auth policy services independently enforce privileged transitions;
- sensitive payload encryption where compatible with policy requirements;
- local Agent revalidates task envelope and capabilities;
- immutable/auditable security events;
- rapid instance replacement/revocation.

Compromise of one gateway must not imply unrestricted local OS execution.

## Threat: Compromised Broker

### Attack/failure

Messages are duplicated, delayed, reordered, or injected through broker misuse.

### Controls

- broker is transport, not authorization source;
- authenticated task envelope checked at consumer/Agent;
- sequence/expiry/replay protection;
- durable authoritative task state in transactional datastore;
- least-privilege broker subjects/streams;
- bounded retention;
- consumer isolation;
- broker credentials per service;
- audit anomalous redelivery/injection patterns.

## Threat: Database Compromise

### Attack

Attacker reads or modifies database state.

### Controls

- encryption at rest/transport;
- least-privilege database roles;
- service-specific credentials;
- no direct public database access;
- audit critical state transitions;
- application-layer validation/signatures for sensitive commands;
- key material separated from general database where possible;
- backups protected separately;
- anomaly detection;
- incident rotation/revocation plan.

Database access alone should not expose endpoint device private keys.

## Threat: Insider Abuse

### Attack

Operator with legitimate infrastructure access misuses it.

### Controls

- least privilege;
- separate production roles;
- just-in-time privileged access where available;
- MFA/strong operator authentication;
- approval/audit for sensitive production actions;
- secrets in KMS/secret manager;
- no shared admin passwords;
- immutable/tamper-evident audit evidence where practical;
- separation of duties for highly sensitive releases/keys.

## Threat: Secret Leakage

### Attack/failure

Secrets appear in logs, traces, task output, source, crash reports, or AI context.

### Controls

- no production secrets in Git/client bundle;
- structured redaction;
- secret references rather than plaintext when possible;
- logs minimize payload content;
- trace attributes allowlist;
- crash report scrubbing;
- provider credentials isolated server-side;
- automated secret scanning;
- immediate rotation path.

## Threat: Malicious File / Prompt / Tool Injection

### Attack

Content read by an AI/coding model instructs it to exfiltrate data or invoke dangerous tools.

### Controls

- models are untrusted planners;
- content cannot modify grants;
- tools require deterministic capability authorization;
- external network/domain scope enforced outside model;
- secrets inaccessible unless separately authorized;
- task scope/workspace confinement;
- dangerous side effects require approval according to risk policy;
- tool-call audit.

## Threat: Denial of Service / Resource Exhaustion

### Attack

Flood connections/tasks/events or force expensive retries/work.

### Controls

- managed DDoS edge;
- WAF/abuse controls;
- layered rate limits;
- connection quotas;
- task/concurrency quotas;
- maximum payload/output sizes;
- bounded queues;
- backpressure;
- slow-consumer policy;
- circuit breakers;
- jittered retry;
- event coalescing/shedding;
- tenant isolation where practical;
- priority lane for revoke/cancel/security traffic.

## Threat: Reconnect Storm

### Failure/attack

Large number of agents simultaneously reconnect after regional/network outage.

### Controls

- exponential backoff with jitter;
- resume tokens/state where safe;
- load-aware admission;
- connection rate limits;
- regional capacity headroom;
- queue/backpressure;
- progressive recovery rather than synchronized retries.

## Threat: Stale Online Presence

### Failure

A dead connection remains shown online and commands appear deliverable.

### Controls

- heartbeats;
- bounded liveness timeout;
- gateway session registry cleanup;
- `degraded/reconnecting/offline` explicit states;
- task delivery ack independent from presence UI;
- no authorization based on presence state.

## Threat: Cancellation / Revocation Race

### Attack/failure

A cancel/revoke races with task delivery or execution start.

### Controls

- ordered durable state transitions;
- cancellation version/sequence;
- priority delivery;
- Agent checks current cancellation/revocation state at defined checkpoints;
- critical privileged operations re-check authorization immediately before side effect where practical;
- late completion cannot overwrite terminal cancelled/revoked state incorrectly.

## Threat: Malicious or Vulnerable Agent Version

### Attack/failure

Old/compromised Computer Agent connects and executes unsafe logic.

### Controls

- signed Agent releases;
- protocol/version negotiation;
- minimum supported version policy;
- remote block/revoke vulnerable versions;
- staged rollout;
- rollback safety;
- update signature verification;
- device/session inventory includes Agent version.

## Threat: Supply-Chain Compromise

### Attack

Dependency, CI runner, release artifact, container, or deployment pipeline is compromised.

### Controls

- lockfiles;
- dependency scans;
- SBOM;
- provenance/attestations where feasible;
- pinned CI actions/tools;
- protected deployment credentials;
- signed artifacts;
- minimal base images/dependencies;
- isolated build/deploy roles;
- reproducible/immutable artifacts where practical;
- emergency release revoke.

## Threat: Region / Infrastructure Failure

### Failure

Gateway region, broker node, database primary, or network path fails.

### Controls

- multiple instances;
- replicated durable state;
- health-aware routing;
- broker/database failover appropriate to deployment tier;
- connection drain;
- tested backup/restore;
- documented RPO/RTO;
- explicit multi-region ownership/failover design before claiming multi-region HA;
- degraded mode that preserves security.

Failover must not weaken replay/authorization guarantees.

## Threat: Clock Manipulation / Drift

### Attack/failure

Endpoint clock differs materially, affecting expiry/freshness.

### Controls

- server-authoritative acceptance windows;
- bounded clock-skew tolerance;
- sequence/nonces in addition to timestamps;
- reject unreasonable time values;
- do not rely on timestamp alone for replay protection.

## Threat: Audit Tampering

### Attack

Attacker modifies/deletes evidence of privileged actions.

### Controls

- append-oriented audit design;
- restricted write paths;
- separate audit service/storage identity;
- retention controls;
- integrity verification/tamper evidence where practical;
- security alerts for unexpected gaps or disabled telemetry;
- operational access audit.

## Threat: Telemetry Privacy Leak

### Failure

Metrics/logging/tracing copies sensitive content.

### Controls

- metadata-first observability;
- content minimization;
- redaction;
- allowlisted trace fields;
- no secrets;
- limited retention;
- role-based telemetry access;
- sampling strategies that do not require raw user payloads.

## Required Security Tests Derived from Threat Model

At minimum:

- stolen session simulation;
- invalid device-proof simulation;
- replayed command;
- duplicate task delivery;
- cross-account destination manipulation;
- capability escalation attempt;
- forged/reused approval;
- expired command;
- wrong destination signature;
- gateway restart/compromise boundary test;
- broker redelivery/reordering;
- database failure/restore;
- reconnect storm;
- slow consumer/event flood;
- cancel/revoke race;
- old Agent version block;
- secret-redaction tests;
- prompt/tool injection attempt;
- protocol fuzzing;
- external penetration testing before broad production release.

## Acceptance Principle

The Control Plane is considered strong only when failure and attack paths are engineered as deliberately as the happy path.

**No network position, server process, AI model, browser session, or single credential receives universal trust.**
