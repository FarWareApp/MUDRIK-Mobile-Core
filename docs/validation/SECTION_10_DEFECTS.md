# Section 10 — Defect Record

## Acceptance Summary

At implementation candidate `acc11fe839c12cae38e31ce25870290b1c09199f`, there are **no known unresolved Blocker, Critical or High Section 10 defects** in the automated/pre-device scope.

Validation on that exact candidate:

- Mobile Core Validation `#724` / ID `36346111692`: **SUCCESS**;
- CodeQL Security Analysis `#619` / ID `36346111701`: **SUCCESS**;
- Section 10 emergency regressions: **143/143 PASS**;
- whole Mobile Core regressions: **792/792 PASS**;
- Expo Doctor: **21/21 PASS**;
- dependency gate: **0 Critical / 0 High / 2 reviewed Moderate**;
- tracked/worktree/history secret gates: **PASS**.

The findings below were discovered during the Section 10 deep implementation audit and closed before pre-device acceptance.

## S10-STATE-001 — Issued predecessor state could remain reusable after a later transition

- Severity: **High**
- Status: **Closed**
- Area: emergency state provenance / replay / cancellation

### Problem

The session-state layer proved that a state object had been issued by the runtime, but issuance alone did not prove that the state was still the current state for that emergency session.

A previously issued `escalating` state could therefore remain structurally valid after a later cancellation or transition unless every downstream caller independently noticed the newer state.
### Repair

The Guardian session-state layer now enforces a single-current-state invariant:

- every accepted state transition installs the new current state for the exact registered session;
- previously issued predecessors become stale immediately;
- downstream event, responsiveness and escalation paths require the current state, not merely an issued state;
- repeated state creation is idempotent and cannot reset an active session;
- retiring the emergency session invalidates current-state provenance.

Action authorization also rechecks that the supplied current state still matches the plan session, account, source device, generation and `escalating` phase.

### Regression Evidence

Covered by:

- `test/mobile-core/emergency-guardian-session-state.test.mjs`;
- `test/mobile-core/emergency-action-policy.test.mjs`.

Cases include predecessor replay, cancellation after planning, copied states and retired-session reuse.

## S10-ACTION-002 — Planned emergency action lacked a complete final action-time authorization boundary

- Severity: **High**
- Status: **Closed**
- Area: contact/call authority / confirmation / route / revocation

### Problem

Planning an escalation must never be treated as authority to perform its external side effects. A robust final boundary must independently prove current trust, exact capability, resource binding, route validity, confirmation policy and simulation status immediately before an action.

A raw UI boolean is not adequate provenance for emergency-call confirmation.
### Repair

A dedicated action authorization layer now:

- rejects every simulation-mode external action;
- rechecks exact current source-device trust;
- requires `emergency.contact.notify` for the exact emergency-contact reference;
- requires Critical `emergency.call.initiate` for the exact resolved call destination;
- rejects generic device/network capabilities as substitutes;
- re-evaluates expiry/revocation at action time;
- re-resolves jurisdiction/platform route compatibility;
- enforces the trusted escalation countdown;
- requires a registry-accepted `confirm_emergency_call` event when route/platform policy requires confirmation;
- derives an opaque in-memory approval with provenance that copied objects cannot reproduce;
- prevents one confirmation event from being rebound to another action.

The layer only returns authorization metadata. It does not itself place a call or notify a contact during pre-device work.

### Regression Evidence

Covered by `test/mobile-core/emergency-action-policy.test.mjs`, including revocation after planning, wrong grants, route mismatch, copied approval, confirmation replay, countdown bypass and simulation attempts.

## S10-PACKET-003 — Sensitive emergency references could enter a packet without exact disclosure capabilities

- Severity: **High**
- Status: **Closed**
- Area: emergency packet / location / medical privacy

### Problem

Configuration preferences such as `shareLocation` or `shareMedicalProfile` express user intent but are not themselves current authorization.

Before the repair, an opaque location or medical-profile reference could be included based on sharing configuration without a separate exact capability check at packet-construction time.
### Repair

Emergency packet construction now requires:

- `emergency.location.read` scoped to the exact location reference before location is included;
- `emergency.medical_profile.read` scoped to the exact medical-profile reference before the medical reference is included;
- current grant validity at trusted packet-construction time;
- fail-closed behavior on wrong resource, wrong capability, expiry or revocation.

The packet remains an allowlisted high-level structure and cannot contain ordinary chat history, raw sensor streams, credentials or arbitrary private data.

A dedicated emergency disclosure policy further downgrades output on personal-shared, household-shared and public/untrusted surfaces, with private audio required for detailed spoken disclosure.

### Regression Evidence

Covered by `test/mobile-core/emergency-packet.test.mjs`.

## S10-MANUAL-004 — Manual escalation preference produced a confirmation-only dead end

- Severity: **Medium**
- Status: **Closed**
- Area: manual confirmation / escalation lifecycle

### Problem

With `automaticEscalation: false`, the planner correctly emitted a user-confirmation step, but the pre-device contract initially lacked a trusted transition from that confirmation-only plan into a concrete execution plan.

Leaving that gap would make the manual path non-actionable or tempt later callers to invent a weaker boolean bypass.
### Repair

The planner now accepts only a registry-issued `confirm_escalation` event bound to the same emergency session, account, source device and generation.

Confirmation:

- cannot precede the source plan;
- cannot come from the future;
- cannot be copied or rebound to another plan;
- is idempotent for the same source plan/event pair;
- produces execution steps that still grant no action authority;
- remains subject to the independent action-time capability boundary.

### Regression Evidence

Covered by `test/mobile-core/emergency-escalation-plan.test.mjs`.

## Pre-Acceptance Scope Completed During the Audit

The deep audit also completed:

- provider-neutral emergency route contracts;
- trusted call-confirmation provenance;
- trusted countdown enforcement;
- typed sanitized emergency security events;
- shared-surface emergency disclosure policy;
- exact packet disclosure capabilities;
- current-state replay invalidation;
- full manual escalation confirmation flow.

## Deferred Layer 4

Physical wearable/health behavior, real permissions, OS/carrier calling, controlled contact delivery, offline/background/restart recovery, battery/latency/accessibility, jurisdiction review and regulated medical review remain mandatory before production closure. Failures discovered there receive new defect IDs.
