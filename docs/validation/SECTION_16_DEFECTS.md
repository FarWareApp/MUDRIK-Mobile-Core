# Section 16 — Defect Record

## Acceptance Summary

At accepted implementation candidate b367dcd277601e3c1745a58cbffdf818e8497d2f, there are no known unresolved Blocker, Critical or High Section 16 defects in the automated/pre-device scope.

Targeted local validation:

- TypeScript: PASS
- Section 16 memory contract suite: 18/18 PASS
- git diff --check: PASS before candidate commits

Hosted validation on the accepted candidate:

- Mobile Core Validation run ID 36626840155: SUCCESS
- CodeQL Security Analysis run ID 36626840066: SUCCESS

## S16-REPLAY-001 — Candidate replay state needed to survive deletion and restart

- Severity: High
- Status: Closed
- Area: deletion / replay / durable restart

### Problem

An in-memory candidate-to-memory binding is insufficient after deletion and process restart. Without a durable replay binding, the same previously approved candidate could theoretically be rebound to a new memory ID and recreate deleted content.

### Repair

Durable snapshots now carry bounded candidate-to-memory identity bindings without private content. Restore requires exact account-consistent records/tombstones/bindings, and a deleted candidate remains replay-blocked after verified restart.

## S16-PROJECTION-002 — Stale or copied derived projections needed generation provenance

- Severity: High
- Status: Closed
- Area: deletion / retrieval / compaction invalidation

### Problem

A structurally valid retrieval or compaction projection could outlive its source state unless it was bound to the exact accepted registry generation. Copying a projection also needed to lose its trusted provenance.

### Repair

The registry issues retrieval and compaction projections with exact-object WeakMap provenance bound to account and state revision. Delete, supersede or policy mutation advances the state revision. Copied or stale projections are rejected, while fresh-conversation reconstruction with no durable memory remains valid.

## S16-INTEGRITY-003 — Syntactically valid digest field was not enough for durable integrity

- Severity: High
- Status: Closed
- Area: storage integrity / restart

### Problem

A snapshot containing a correctly shaped hash string is not evidence that the snapshot was authenticated. Restore needed a real integrity-verification boundary, not merely structural validation.

### Repair

Added provider-independent MemoryIntegrityProvider, canonical snapshot payload sealing/verification and verified-object provenance. Direct serialized restore fails closed; tampered integrity fails; only a verified snapshot object can enter restore.

## S16-COMPANION-004 — Companion memory policy reference needed exact account/policy binding

- Severity: High
- Status: Closed
- Area: authority separation / Companion integration

### Problem

A Companion profile memoryPolicyId is only a reference and cannot prove current account ownership, policy identity or retrieval permission by itself.

### Repair

Added strict Companion memory-policy resolution using the current account and parsed MemoryPolicy. Wrong account/policy and disabled memory fail closed. The binding never returns categories and explicitly grants no memory, category, retrieval, execution or tool authority.

## S16-CONFLICT-005 — Compaction needed explicit conflict preservation

- Severity: Medium
- Status: Closed
- Area: context compaction / truth preservation

### Problem

Compacting multiple approved records with the same category/topic but different content could silently imply one merged certainty unless conflict state and source provenance were explicit.

### Repair

Deterministic compaction groups preserve every source memory ID/revision/content and mark distinct facts as conflict. No synthetic merged fact is created.

## Deferred Layer 4

Real SQLite/device persistence, kill/restart behavior, storage-full/low-memory handling, backup/restore, logout removal, optional cloud/multi-device synchronization, encryption-at-rest/key lifecycle, deletion propagation, large-set performance, migrations, privacy/export UX, accessibility/localization and independent privacy/security review remain mandatory before Section 20 production closure.
