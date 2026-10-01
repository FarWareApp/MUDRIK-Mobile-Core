# Section 19 — Defect Record

## Candidate Summary

Implementation candidate:

`e82a40c62585ad6b28a1b043825daebf29c9feb3`

Local validation:

- Section 19 suite: 57/57 PASS
- whole Mobile Core: 976/976 PASS
- Computer Agent: 184/184 PASS
- Control Plane: 59/59 PASS
- Expo Doctor: 21/21 PASS
- dependency audit blocking gate: 0 Critical / 0 High
- TypeScript / ESLint / diff check: PASS

Hosted validation on the exact candidate passed: Mobile Core Validation #789 / 36901033163 SUCCESS; CodeQL #685 / 36901033032 SUCCESS. No known unresolved Blocker, Critical or High Section 19 defect remains in the automated/pre-device scope.

## S19-DISCOVERY-001 — Vendor discovery must not become admission authority

- Severity: High
- Status: Closed

### Problem

A vendor can report arbitrary devices and capabilities. Treating discovery as permission would let external metadata manufacture action authority.

### Repair

Discovery is zero-authority descriptive state. The registry requires a separate account/workspace-bound device binding and admits only capability IDs present in the mapped discovery set. Credential access requires an active admitted binding, not discovery alone.

## S19-CAPABILITY-002 — Home read/access/security required separate core capabilities

- Severity: High
- Status: Closed

### Problem

Using one generic home-device capability for state reading, access control and security control would make grants unnecessarily broad.

### Repair

The core capability vocabulary now separates `home.device.read`, `home.access.control` and `home.security.control`. Access/security remain critical-risk core grants while ordinary state reading does not inherit access-control authority.

## S19-AUTOMATION-003 — Trigger authorization needed per-run action provenance

- Severity: High
- Status: Closed

### Problem

A valid automation trigger cannot safely authorize arbitrary later commands or allow one action to be rebound to a different command.

### Repair

Every accepted trigger creates a short-lived `IntegrationAutomationExecution` bound to policy, automation, routine, event and exact action list. Commands carry execution ID plus action index. Registry authorization checks exact target/capability/value and records a one-action claim; conflicting reuse under another command ID fails closed.

## S19-APPROVAL-004 — Approval-shaped input needed registry provenance

- Severity: High
- Status: Closed

### Problem

A structurally valid approval object supplied by an untrusted caller must not be sufficient to unlock high-risk actions.

### Repair

Approvals are recorded in the integration registry, bound to command ID, binding revision, capability, account/workspace and lifetime. High-risk command authorization requires exact stored approval provenance in addition to the approval contract.

## S19-INVOCATION-005 — Vendor invocation/results needed credential-free issued provenance

- Severity: High
- Status: Closed

### Problem

Passing adapter credentials through command or result projections would widen secret exposure. Accepting arbitrary vendor results could also let external payloads masquerade as command state.

### Repair

The registry issues a credential-free adapter invocation only after command authorization. Credentials resolve only through the internal adapter-binding boundary. Results are accepted only for a matching issued invocation and exact binding/device/adapter/integration identity. Replay is idempotent only for the exact same result.

## S19-REVOCATION-006 — Binding revocation cannot depend on fresh vendor discovery

- Severity: Medium
- Status: Closed

### Problem

If a vendor/device disappears, requiring a current discovery record before revocation could prevent immediate local deauthorization.

### Repair

The registry has a direct monotonic binding-revocation path that increments binding revision and invalidates stale command/routine/automation references without requiring vendor discovery.

## S19-REPLAY-007 — Command, trigger and result replay needed semantic conflict detection

- Severity: High
- Status: Closed

### Problem

ID reuse with changed semantics could cause duplicate external actions or stale state acceptance.

### Repair

Trigger events, adapter invocations, automation action claims and result envelopes retain semantic fingerprints or exact issued provenance. Exact retries are idempotent; changed semantics under an existing identity fail closed.

## Deferred Layer 4

Real vendors/hubs/devices, physical high-risk controls, credential lifecycle, network/cloud outages, scheduler persistence, partial routine failure, vendor limits, privacy/data-residency review and independent security testing remain mandatory before Section 20 production closure.
