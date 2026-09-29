# Section 14 — Automated Evidence

## Acceptance State

PRE-DEVICE COMPLETE — OPEN / REAL-INFRASTRUCTURE LAYER 4 DEFERRED

This evidence closes the deterministic/automated pre-device obligations for Section 14 only. It does not claim production WSS infrastructure, real broker/database failover, multi-instance ownership, production KMS/service identity or measured production latency/SLA.

## Accepted Candidate

- Branch: mudrik-core-v1
- Accepted commit: ec2233eacd28332d13a83b809760e022918cc908
- Accepted message: Run control plane tests in CI

Accepted implementation chain:

- 2788590 — Add control plane identity routing contracts
- ee63389 — Add durable control task lifecycle
- da56bc6 — Add reliable control-plane reconnect semantics
- 1bdf986 — Align Expo SDK 57 patch dependencies
- 53dd3f1 — Complete reliable control plane routing core
- ec2233e — Run control plane tests in CI

## GitHub Validation Evidence

### Mobile Core Validation

- Workflow: Mobile Core Validation
- Run number: #755
- Run ID: 36591646407
- Head SHA: ec2233eacd28332d13a83b809760e022918cc908
- Result: SUCCESS

Evidence:

- tracked sensitive-file gate: PASS
- full Git-history secret scan: PASS
- dependency vulnerabilities: 0 Critical / 0 High / 2 reviewed Moderate
- lint: PASS
- TypeScript: PASS
- Mobile Core regressions: 792/792 PASS
- Expo Doctor: 21/21 PASS
- Computer Agent suite: 184 tests / 160 PASS / 24 expected backend-dependent SKIP / 0 FAIL
- Control Plane routing suite: 59/59 PASS

The hosted GitHub runner does not provide Bubblewrap; backend-dependent Computer Agent tests explicitly skip there rather than silently falling back to unsandboxed execution.

### Real Linux Pre-Device Validation

On the connected Pop!_OS development machine:

- Control Plane regressions: 59/59 PASS
- Computer Agent regressions: PASS with the real Linux backend available
- Mobile Core regressions: 792/792 PASS
- TypeScript: PASS
- ESLint: PASS
- Expo Doctor: 21/21 PASS
- git diff --check: PASS
- secret-signature/static control-plane scans: PASS

### CodeQL

- Workflow: CodeQL Security Analysis
- Run number: #651
- Run ID: 36591646475
- Head SHA: ec2233eacd28332d13a83b809760e022918cc908
- Result: SUCCESS
- JavaScript/TypeScript analysis: PASS

## Implemented Section 14 Controls

The accepted candidate provides:

- exact account/session/device/task/approval/control identifiers;
- authenticated same-account routing and destination authorization;
- strict versioned routed-task parsing and trusted-time freshness;
- immutable logical task identity and destination binding;
- durable HMAC-protected task records with CAS transitions;
- atomic task-file writes with file and directory fsync;
- no-follow bounded durable record reads;
- durable task nonce replay rejection across restart and concurrent admission;
- durable approval storage with exact task/capability/scope/risk/policy binding;
- one-shot approval consumption that survives restart;
- deterministic task lifecycle separating delivery ack, execution start and completion;
- monotonic agent event sequencing with duplicate/conflict/gap/stale rejection;
- terminal-state overwrite protection;
- cancel/revoke idempotency and precedence;
- pre-delivery source-session/device/approval reauthorization;
- at-least-once delivery with stable logical task identity;
- bounded reconnect/resume cursor semantics;
- delivery-ID conflict/replay tombstones;
- redelivery supersession without creating another logical queue slot;
- bounded queue/backpressure with reserved cancel/revoke capacity;
- bounded presence/liveness state;
- deterministic bounded reconnect backoff;
- fixed-window event-flood rate limiting and bounded key cardinality;
- slow-consumer telemetry coalescing;
- privacy-minimized control audit events;
- broker/gateway failure represented as durable uncertainty rather than fabricated success;
- gateway restart reconstruction from durable task truth;
- Control Plane approval that never manufactures local Computer Agent capability authority;
- CI coverage for the full Control Plane routing suite.

## Adversarial Evidence Highlights

Regression coverage proves at minimum:

- cross-account/cross-device routing fails closed;
- copied device/session metadata does not create trusted identity;
- invalid/revoked session/device state blocks routing or pre-delivery;
- duplicate logical task admission is idempotent;
- conflicting task-ID reuse fails;
- same nonce on a different task fails after restart;
- concurrent same-nonce creation serializes to one accepted task;
- stale/expired routed tasks fail;
- approval cannot be rebound to another task;
- consumed single-use approval remains consumed across restart;
- same-sequence event conflict, gaps, stale and malicious future sequences fail;
- late completion cannot overwrite cancellation;
- broker failure after durable delivery yields explicit uncertainty;
- reconnect/redelivery does not create duplicate local execution identity;
- cancel racing an unacknowledged delivery supersedes transport work;
- presence can remain online while revoked identity authorization still fails closed;
- stale/future resume cursors fail;
- event flood/backpressure remains bounded;
- telemetry remains advisory, bounded and privacy-safe;
- malformed protocol injection fails closed;
- server-routed work still passes local Computer Agent admission/policy.

## Closed Defects

See docs/validation/SECTION_14_DEFECTS.md.

No known unresolved Blocker, Critical or High Section 14 defect remains in the automated/pre-device scope at the accepted candidate.

## Deferred Layer 4 / Production Obligations

Before production closure Section 14 still requires:

- real TLS/WSS persistent sessions with no plaintext fallback;
- real short-lived device challenge/proof sessions;
- production PostgreSQL transactional persistence/migrations;
- production durable broker redelivery/ack/restart validation;
- real presence infrastructure with no authorization role;
- gateway crash/drain/restart under actual network partitions;
- reconnect storms, packet loss and slow-consumer load;
- database/broker failover and backup/restore;
- revocation propagation latency measurement;
- p50/p95/p99 delivery/ack latency;
- multi-instance and future multi-region ownership rules;
- production abuse/DDoS/rate-limit controls;
- production KMS/secret-manager/service identity;
- cross-process/database-enforced nonce uniqueness under multi-instance concurrency;
- independent security/penetration review.

## Acceptance Rule

Section 14 is accepted only at the pre-device level. The Control Plane may authenticate, route, persist and reconcile commands, but it remains non-authoritative for local tool execution. Sections 11/12 remain the final local execution authority, and Section 20 must validate every deferred real-infrastructure obligation before production release.
