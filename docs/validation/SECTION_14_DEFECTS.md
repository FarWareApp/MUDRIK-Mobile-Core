# Section 14 — Defect Record

## Acceptance Summary

At accepted candidate ec2233eacd28332d13a83b809760e022918cc908, there are no known unresolved Blocker, Critical or High Section 14 defects in the automated/pre-device scope.

Validation:

- Mobile Core Validation #755 / ID 36591646407: SUCCESS
- CodeQL Security Analysis #651 / ID 36591646475: SUCCESS
- Control Plane regressions: 59/59 PASS
- Mobile Core regressions: 792/792 PASS
- Expo Doctor: 21/21 PASS
- dependency gate: 0 Critical / 0 High / 2 reviewed Moderate
- tracked/history secret gates: PASS

## S14-NONCE-001 — Durable Control Plane admission lacked cross-task nonce replay enforcement

- Severity: High
- Status: Closed
- Area: replay protection / durable admission

### Problem

Task-ID conflict handling alone did not prevent a new Task ID from reusing a nonce already accepted by another durable task. A process restart would also erase any purely in-memory nonce memory.

### Repair

Task creation now serializes durable creation and checks nonce uniqueness against integrity-verified durable task records before accepting a new task. Tests prove replay rejection after restart and under concurrent same-nonce creation.

## S14-APPROVAL-002 — One-shot approval consumption needed durable restart-safe truth

- Severity: High
- Status: Closed
- Area: approval replay / persistence

### Problem

An in-memory approval registry cannot prove that a one-shot approval remains consumed after gateway restart.

### Repair

DurableApprovalRegistry persists integrity-protected approval state atomically, binds approval to exact account/session/destination/task/capability/scope/risk/policy and serializes concurrent consumption. Restart and wrong-binding tests are green.

## S14-STORE-003 — Durable record handling needed stronger crash and symlink hardening

- Severity: High
- Status: Closed
- Area: durable task integrity

### Problem

Durable task writes needed explicit file sync/directory sync, bounded no-follow reads and exact filename/task-ID binding to make restart evidence and tamper handling fail closed.

### Repair

The store now writes through exclusive temporary files, fsyncs file and directory, performs no-follow bounded reads, verifies HMAC integrity and exact task identity, and rejects malformed/tampered records.

## S14-TERM-004 — Exact duplicate terminal controls needed reason-bound idempotency

- Severity: Medium
- Status: Closed
- Area: cancel/revoke retry semantics

### Problem

An exact retry of a terminal cancel/revoke could be rejected as a generic terminal-state transition, complicating reliable at-least-once control delivery.

### Repair

Terminal transitions now recognize an exact same terminal event with the same stable reason code as idempotent while conflicting terminal rewrites remain rejected.

## S14-CI-005 — Hosted validation did not execute the Control Plane suite

- Severity: Medium
- Status: Closed
- Area: release evidence / CI

### Problem

The Mobile Core Validation workflow ran Mobile Core and Computer Agent regressions but did not execute control-plane/test/*.test.mjs, so Section 14 had no hosted regression gate.

### Repair

The workflow now includes Control Plane routing tests. Accepted run #755 executed 59/59 Control Plane tests successfully on the accepted SHA.

## Deferred Layer 4

Production WSS, real broker/database transactions, multi-instance nonce uniqueness, partition/reconnect storms, failover, KMS/service identity, measured latency and independent security review remain mandatory before Section 20 production closure.
