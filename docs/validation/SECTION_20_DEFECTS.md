# Section 20 — Defect Record

## Candidate Summary

Candidate SHA:

`bee020aed301b2889ea36aadfbd8f9f0c7aae0c6`

Local validation:

- Section 20 authority/release/preflight tests: 17/17 PASS
- whole Mobile Core: 993/993 PASS
- Computer Agent: 184/184 PASS
- Control Plane: 59/59 PASS
- Expo Doctor: 21/21 PASS
- dependency blocking audit: 0 Critical / 0 High
- TypeScript / ESLint / diff check: PASS

Hosted validation on the exact candidate passed: Mobile Core Validation #794 / 36903705654 SUCCESS; CodeQL #690 / 36903705476 SUCCESS. No known unresolved Blocker, Critical or High defect remains in the automated Section 20 composition scope.

## S20-RELEASE-001 — Production preflight did not enforce whole-system certification state

- Severity: High
- Status: Closed

### Problem

The existing `release:preflight` validated EAS/build configuration and a clean Git tree, but could print PASS while mandatory physical/real-environment/certification obligations were still open.

### Repair

The preflight now requires `MUDRIK_RELEASE_MANIFEST`, binds its `candidateSha` to the exact current HEAD, evaluates it through the executable Section 20 release gate, and exits non-zero for any blocker. With no certification manifest, current production preflight fails closed.

## S20-AUTHORITY-002 — Whole-system composition needed explicit non-escalation proof

- Severity: High
- Status: Closed

### Problem

Subsystem-level tests proved local zero-authority contracts, but Section 20 also needed proof that combining valid outputs from Memory, Knowledge, Intelligence, Integrations and routing could not accidentally satisfy another subsystem's authority parser.

### Repair

Whole-system adversarial tests now pass real valid subsystem outputs through capability and approval boundaries. Non-authoritative outputs, including grant-shaped mutations, fail to become capability grants or high-risk approvals. Control Plane routed tasks also fail direct Computer Agent signed-envelope admission.

## S20-MANIFEST-003 — Release evidence needed exact section completeness, trusted time and explicit failure states

- Severity: High
- Status: Closed

### Problem

A release checklist represented only as prose could omit a section, hide a failed real-environment gate among deferred items, use future evidence time or fail to bind release evidence to a candidate SHA.

### Repair

The executable release manifest requires exactly one row for every Section 01–19, explicit Layer 4 state, unresolved high-severity defect count, exact candidate SHA, trusted-time evaluation and independent top-level certification checks. Malformed or incomplete evidence fails closed.

## S20-POLICY-004 — Release tests and production preflight risked policy drift

- Severity: Medium
- Status: Closed

### Problem

Duplicating release decision logic between tests and the production preflight could allow one path to weaken while the other remained green.

### Repair

A shared TypeScript module loader now allows the production preflight and automated tests to execute the same `src/core/release/wholeSystemReleaseGate.ts` policy implementation.

## Mandatory Open Certification Debt

This is not a defect-closure claim for production. Real-environment and independent certification obligations remain OPEN as recorded in `SECTION_20_DEFERRED_LAYER4_INVENTORY.md`. Section 20 must remain production-blocked until those obligations pass on current candidate artifacts.
