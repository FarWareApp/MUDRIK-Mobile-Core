# Section 07 — Defect Record

## Acceptance Summary

At implementation candidate `dabc897cd78133bd2cbaf17cbe3e637f5f9d7b21`, there are **no known unresolved Critical or High Section 07 defects** in the automated/pre-device scope.

The defects below were discovered during the Section 07 deep audit and were closed before pre-device acceptance.

## S07-HANDOFF-001 — Handoff manifest was not bound to the previous primary owner

- Severity: **High**
- Status: **Closed**
- Area: handoff integrity / state transfer

### Problem

The handoff binding validated the destination lease, generation, session and privacy state, but did not prove that `sourceSurfaceId` was the owner of the immediately preceding primary generation. A different surface that knew valid identifiers could therefore construct a syntactically valid state manifest and attempt to inject conversation/task/context references into the current destination.

The manifest granted no execution, sensor, memory or disclosure authority, but accepting state references from an unproven source violated the Section 07 handoff-integrity boundary.

### Repair

- handoff binding now requires both the previous source lease and the active target lease;
- source session and surface must match the manifest;
- source generation must be exactly `target generation - 1`;
- the source lease must still have been active when the target lease was issued;
- source, target and manifest privacy state must match;
- malformed or forged chains fail closed;
- inherited authority remains structurally false.

### Regression Evidence

- implementation: `199cfc87788204db8d069243935ac20f0abb8122`;
- regression: `ca8259761fac4ed715e94dffaf1fd0178fd498c3`;
- test: `test/mobile-core/handoff-lease-binding.test.mjs`.

## S07-PRESENCE-001 — Presence evidence could be replayed across logical companion sessions

- Severity: **High**
- Status: **Closed**
- Area: presence replay isolation

### Problem

A presence observation was scoped only to `surfaceId`. Fresh evidence from one logical presence session could therefore be reused while resolving another session on the same surface.

That could influence automatic surface selection without proving that the evidence belonged to the session being resolved.

### Repair

- every presence observation now carries a strict `presenceSessionId`;
- registry ordering is isolated by `presenceSessionId + surfaceId`;
- resolver requires observation session identity to equal the requested logical session;
- cross-session replay is rejected even if the observation is otherwise fresh and the surface/device are trusted.

### Regression Evidence

- registry binding: `1254dc5c26a8d4b977dc7ed00aaaa6fea365341b`;
- resolver rejection: `c234356a13554a7c65def5ef0fbb5a48b2fcee0a`;
- regressions: `ba71a8f0926f47353e96d0db1bfcca19b751c53f`, `44771d301df0d2dd28b5718ddeb0780aa4623153`;
- tests:
  - `test/mobile-core/presence-contract-registry.test.mjs`;
  - `test/mobile-core/presence-resolver.test.mjs`.

## S07-LEASE-001 — A newer handoff generation could carry rolled-back timing

- Severity: **High**
- Status: **Closed**
- Area: primary ownership lease ordering

### Problem

Generation advancement was monotonic, but the in-memory and SQLite lease paths did not independently require the new lease timestamp to be monotonic or require the previous lease to have been active when the new lease was issued.

A higher generation with an older `issuedAt` could therefore supersede the current owner even though its temporal chain was inconsistent.

### Repair

- a new generation cannot use an `issuedAt` older than the current generation;
- the previous lease must still be active at the new lease's issue time;
- the same invariants are enforced by both the in-memory registry and SQLite persistence;
- stale/replayed ownership remains unable to reclaim the primary surface.

### Regression Evidence

- registry implementation: `f24a1b9fee6833d11f89de6d19db2028e08687ab`;
- persistence implementation: `ef640ecbe6b84500fa87a7fcca1f8ad31c85cc1c`;
- regressions: `b82eac66012b0b4052239c9c833ded8f6df2504a`, `6f38933bfe2460beaa3982fe49676cc165a7c1ff`;
- tests:
  - `test/mobile-core/primary-surface-lease.test.mjs`;
  - `test/mobile-core/primary-surface-lease-persistence.test.mjs`.

## S07-PERSIST-001 — Persisted trusted-surface approval time could move backwards

- Severity: **Medium**
- Status: **Closed**
- Area: trusted-surface persistence

### Problem

The in-memory trusted-surface registry rejected a newer revision with an older approval timestamp, but the SQLite repository did not independently enforce that invariant.

### Repair

SQLite persistence now rejects any trusted-surface update whose `approvedAt` moves backwards relative to the persisted record.

### Regression Evidence

- implementation: `6a0e952f20b3b8b4a5355485537c10111d72e20b`;
- regression: `dabc897cd78133bd2cbaf17cbe3e637f5f9d7b21`;
- test: `test/mobile-core/trusted-surface-persistence.test.mjs`.

## Deferred Findings Are Not Defects Yet

The following remain Layer 4 validation debt until real hardware/environment verification is performed:

- real phone-to-display/web handoff;
- two trusted physical devices and real revoke behavior;
- Wi-Fi/cellular/offline/reconnect transitions;
- process death during handoff;
- physical no-double-microphone/no-double-audio verification;
- private-content suppression on a real shared display/speaker;
- accessibility and visible handoff status;
- latency, battery and recovery behavior;
- supported headset/Bluetooth/AR/VR hardware behavior.

Any Layer 4 failure will receive a new defect ID, deterministic regression where feasible, repair, and exact-candidate retest before final production closure.
