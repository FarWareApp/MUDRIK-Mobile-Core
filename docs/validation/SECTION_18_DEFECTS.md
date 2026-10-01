# Section 18 — Defect Record

## Acceptance Summary

Accepted implementation candidate:

`8ec1c7be240e41df1791e44a65042a4df33327e7`

Validation:

- Section 18 intelligence-router suite: 27/27 PASS
- whole Mobile Core: 919/919 PASS
- Computer Agent: 184/184 PASS
- Control Plane: 59/59 PASS
- Expo Doctor: 21/21 PASS
- dependency audit blocking gate: 0 Critical / 0 High
- Mobile Core Validation #782 / 36894185071: SUCCESS
- CodeQL #678 / 36894185109: SUCCESS

No known unresolved Blocker, Critical or High Section 18 defect remains in the automated/pre-device scope.

## S18-POLICY-001 — Structurally valid plans needed current-policy provenance

- Severity: High
- Status: Closed
- Area: routing policy / stale authorization

### Problem

A route plan cannot remain trusted merely because its structure is valid or because it was once issued. Tightening the workspace routing policy must invalidate previously issued online/provider selections and any later output tied to them.

### Repair

The registry now tracks exact-object issued-plan provenance and verifies the current account/workspace policy ID and revision. Policy revision invalidates plan trust, adapter binding, failover, result acceptance and in-flight attempt output.

## S18-TIME-002 — Provider health and routing policy needed trusted-time validation

- Severity: High
- Status: Closed
- Area: health freshness / time authority

### Problem

Caller-supplied timestamps alone could otherwise allow future health or policy records to masquerade as current and influence route selection.

### Repair

`setPolicy`, `updateHealth` and `route` now require trusted evaluation time. Future policy updates, provider-health observations and routing requests fail closed. Health revisions also remain monotonic.

## S18-CREDENTIAL-003 — Credential references needed an adapter-private boundary

- Severity: High
- Status: Closed
- Area: credential isolation

### Problem

Provider routing requires internal knowledge of provider credentials, but exposing credential references in public provider descriptors or route plans would widen the client/model trust surface.

### Repair

Internal provider registration retains only bounded credential references. Public descriptors strip the field entirely. Credential resolution occurs only through the registry adapter-binding boundary for an exact issued plan and an admitted, currently non-unavailable provider/model.

## S18-OUTPUT-004 — Multi-provider output needed generation and sequencing isolation

- Severity: High
- Status: Closed
- Area: failover / streaming integrity

### Problem

Switching providers after observable output could silently mix different model/STT/TTS outputs into one logical response. Streaming output also required deterministic duplicate/gap/conflict handling.

### Repair

Post-output failover requires explicit restart and generation rotation. STT additionally requires buffered input replay. Attempt tracking binds request/plan/provider/model/service/generation, enforces contiguous sequence, accepts exact duplicates idempotently and rejects conflicts, gaps, post-final output and late output after plan invalidation.

## S18-OFFLINE-005 — Routing policy needed a real deny-all-online state

- Severity: Medium
- Status: Closed
- Area: offline policy

### Problem

The initial list parser required every service list to be non-empty, which prevented a workspace from expressing `onlineAllowedServices: []`.

### Repair

The generic policy list parser now supports an explicit minimum cardinality. Enabled services and optimization lists remain non-empty, while onlineAllowedServices may validly be empty.

## S18-FAILURE-006 — Provider failure text needed secret-safe normalization

- Severity: Medium
- Status: Closed
- Area: diagnostics / privacy

### Problem

Provider error strings are untrusted and may contain credentials or sensitive upstream text.

### Repair

Provider failures normalize to stable internal codes. Non-retryable codes remain non-retryable even if the provider says otherwise, and secret-shaped or oversized provider messages are discarded.

## Deferred Layer 4

Real providers, local models, real network interruption, provider rate limits/timeouts, credential vault/key lifecycle, measured cost/latency/quality, resource pressure, provider billing, privacy/data-residency review and independent security testing remain mandatory before Section 20 production closure.
