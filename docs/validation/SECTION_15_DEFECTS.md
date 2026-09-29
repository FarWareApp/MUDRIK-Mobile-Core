# Section 15 — Defect Record

## Acceptance Summary

At accepted candidate a7aa9931c438eae93beea2ceaccdca299b8ad79c, there are no known unresolved Blocker, Critical or High Section 15 defects in the automated/pre-device scope.

Local validation:

- Mobile Core regressions: 842/842 PASS
- Control Plane regressions: 59/59 PASS
- Computer Agent regressions: 184/184 PASS
- Expo Doctor: 21/21 PASS
- dependency gate: 0 Critical / 0 High / 5 Moderate
- worktree secret-signature gate: PASS

Hosted validation on the accepted candidate:

- Mobile Core Validation run ID 36620054699: SUCCESS
- CodeQL Security Analysis run ID 36620054563: SUCCESS
- hosted Control Plane regressions: 59/59 PASS

## S15-SESSION-001 — Surface actions lacked explicit stale-tab/replay binding

- Severity: High
- Status: Closed
- Area: authenticated surface session / replay safety

### Problem

Task/control/approval intents were account/task/device-bound but did not yet have an independent authenticated surface-session envelope with monotonic action sequence and surface-instance revision. A stale browser tab or changed same-sequence action therefore needed an explicit fail-closed boundary before Section 14 routing.

### Repair

Added strict Web/Mobile surface-session and action-envelope contracts plus CommandSurfaceActionRegistry. Exact replay is idempotent; stale/gapped/conflicting sequences, expired sessions, stale session revisions and cross-session/account/device/surface substitutions fail closed.

## S15-STATE-002 — Surface reconnect/offline state needed deterministic separation from execution truth

- Severity: High
- Status: Closed
- Area: projection/reconnect state

### Problem

Without one bounded reducer, duplicate/reordered projections or connectivity changes could be interpreted inconsistently by future Web/Mobile adapters, including false success or terminal-state regression.

### Repair

Added CommandSurfaceStateStore with monotonic revision handling, terminal non-regression, exact result binding, bounded collections and separate connectivity certainty. Offline/reconnecting active tasks are explicitly last-known rather than fabricated as completed.

## S15-DISCLOSURE-003 — Approval scope and device labels did not share the secret-safe disclosure filter

- Severity: High
- Status: Closed
- Area: privacy / UI disclosure

### Problem

Result/history text already rejected strong secret signatures, while approval scope summaries and device display names initially enforced only generic text bounds. Secret-like material could therefore have entered an approval/device projection.

### Repair

Approval scope summaries and device display names now use isSafeSurfaceText, rejecting strong secret signatures, opaque secret references and unsafe control characters. Regression tests cover both fields.

## S15-UX-004 — Destructive and approval actions needed direction-independent semantic identity

- Severity: Medium
- Status: Closed
- Area: accessibility / RTL / control semantics

### Problem

The surface contracts did not yet explicitly prove that RTL/LTR layout changes could not alter action identity or destructive/approval meaning, nor encode minimum touch-target and assistive-control semantics.

### Repair

Added command control presentation contracts with stable action identity, explicit destructive/approval/rejection semantics, 48 dp minimum touch targets, keyboard reachability, screen-reader roles and immediate Stop reachability for cancellable active tasks.

## S15-GATEWAY-005 — Surface adapters needed an explicit non-execution routing boundary

- Severity: High
- Status: Closed
- Area: authority separation

### Problem

Individual intents were non-authoritative, but an explicit shared Web/Mobile gateway contract was still needed to prove that a compromised surface adapter cannot directly manufacture execution or capability-grant authority.

### Repair

Added CommandSurfaceGateway. It validates session/action/intent contracts and emits routing requests with grantsAuthority=false, performsExecution=false and createsCapabilityGrant=false. Malicious prose, hidden grant fields and cross-session manipulation are covered by adversarial tests.

## Deferred Layer 4

Production authenticated sessions, WSS/API, mobile/browser runtime behavior, real notifications/deep links, browser security controls, physical accessibility/RTL validation and independent Web/mobile penetration testing remain mandatory before Section 20 production closure.
