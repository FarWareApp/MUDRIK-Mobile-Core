# Section 11 — Defect Record

## Acceptance Summary

At implementation candidate `e3cc7e8d64b89f584d3cb2f64a052d7f553c495b`, there are **no known unresolved Blocker, Critical or High Section 11 defects** in the automated/pre-device scope.

Validation on that exact candidate:

- Mobile Core Validation `#726` / ID `36358953372`: **SUCCESS**;
- CodeQL Security Analysis `#621` / ID `36358953373`: **SUCCESS**;
- Computer Agent regressions: **71/71 PASS**;
- whole Mobile Core regressions: **792/792 PASS**;
- Expo Doctor: **21/21 PASS**;
- dependency gate: **0 Critical / 0 High / 2 reviewed Moderate**;
- tracked/worktree/history secret gates: **PASS**.

The findings below were discovered during the Section 11 deep implementation audit and closed before pre-device acceptance.

## S11-RECOVERY-001 — Interrupted side effects could be replayed without an explicit uncertainty boundary

- Severity: **High**
- Status: **Closed**
- Area: restart recovery / side-effect idempotence

### Problem

A process can terminate after an external action has started or completed but before its final completion checkpoint is persisted. Treating the missing final checkpoint as permission to retry would risk duplicate external side effects.

### Repair

The runtime now durably marks a step as in-flight before adapter execution. If restart finds an in-flight marker without a final checkpoint, recovery blocks the task as `uncertain_step` and never automatically replays it.

### Regression Evidence

Covered by durable store/runtime tests for restart with an in-flight step, completed-task restart and explicit resume rejection for uncertain work.

## S11-STORE-002 — Concurrent durable mutations could lose lifecycle, checkpoint or audit updates

- Severity: **High**
- Status: **Closed**
- Area: durable persistence / race safety

### Problem

Atomic file replacement prevents partial files but does not by itself prevent two concurrent read-modify-write operations from both reading the same revision and letting the last writer erase the first writer's accepted fact.

### Repair

The durable store now serializes mutations per task. Lifecycle transitions, step-start markers, checkpoints and event appends for the same task are ordered through a per-task mutation lock before reading and writing state.

### Regression Evidence

Concurrent append tests prove every event sequence is preserved. A pause/checkpoint race proves the final record contains both the paused lifecycle state and the completed checkpoint.

## S11-INTEGRITY-003 — Structurally valid local-state tampering was not cryptographically evident

- Severity: **High**
- Status: **Closed**
- Area: durable state integrity / audit tampering

### Problem

Schema validation alone can reject malformed records but cannot detect a local modification that remains structurally valid, such as rewriting lifecycle state, checkpoint progress or event history.

### Repair

Every durable record now carries an HMAC-SHA-256 integrity tag over canonical record content. The store requires a non-persisted binary integrity key of at least 32 bytes and verifies the tag before accepting any loaded record.

### Regression Evidence

Tests cover wrong-key reads, structurally valid lifecycle tampering and signed-task field tampering after persistence.

## S11-ENVELOPE-004 — Signed nested execution input remained mutable after parsing

- Severity: **High**
- Status: **Closed**
- Area: signed task provenance / post-verification mutation

### Problem

A shallow freeze of `step.input` could leave nested arrays or objects shared with the caller. A caller retaining the original object could mutate an argument after signature verification while the parsed task still referenced that nested object.

### Repair

The task parser now validates plain JSON objects and creates a recursively detached immutable copy of nested execution input. Metadata is bounded to the flat schema-compatible form.

### Regression Evidence

A dedicated regression mutates the original nested `args` array after parsing and proves the accepted task remains unchanged and frozen.

## S11-POLICY-005 — Policy could evaluate different terminal values from those actually executed

- Severity: **High**
- Status: **Closed**
- Area: authorization parity / implicit defaults

### Problem

When terminal `cwd` or `timeoutMs` was omitted, execution supplied runtime defaults while policy evaluation could see `undefined`. That creates a mismatch between authorized context and executed context.

### Repair

Terminal defaults are now shared with policy context. The policy evaluates the effective working directory and effective timeout that execution will actually use.

### Regression Evidence

Tests prove an omitted cwd cannot escape filesystem scope and an omitted timeout cannot exceed a grant's maximum duration.

## S11-GRANT-006 — Malformed grant structure could skip intended scope checks

- Severity: **High**
- Status: **Closed**
- Area: permission grants / fail-closed authorization

### Problem

Loose grant objects could contain unrecognized modes or malformed scope fields. Conditional scope checks based only on `Array.isArray` could skip a restriction when the field type was wrong or empty.

### Repair

A strict permission-grant parser now validates grant IDs, exact device, known capability, known mode, trusted timestamps, revocation, scope field types, bounded string arrays, duration limits and explicit terminal filesystem/executable scope.

### Regression Evidence

Tests cover malformed mode, malformed scope types, future-created grants, missing explicit terminal cwd/executable coverage and duration overflow.

## S11-OBSERVER-007 — Non-authoritative observer exceptions could interrupt successful durable execution

- Severity: **Medium**
- Status: **Closed**
- Area: audit observers / fault containment

### Problem

An external event observer callback is not authoritative, but an exception thrown by that callback could propagate after durable state had already been written and make the caller observe a failed runtime operation.

### Repair

Observer delivery is isolated from authoritative state. Callback exceptions are contained after the durable event has been committed.

### Regression Evidence

A runtime test uses an observer that always throws and proves the task still reaches durable success with its event history intact.

## Deferred Layer 4

Real OS process crashes, power loss, filesystem durability under interruption, keyring-backed integrity-key provisioning/rotation, service lifecycle, network reconnect, resource pressure and real permission/elevation behavior remain mandatory before production closure. Section 12 separately owns broader tool and filesystem sandbox boundaries.
