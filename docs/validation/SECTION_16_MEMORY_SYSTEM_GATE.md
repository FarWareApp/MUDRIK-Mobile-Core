# Section 16 — Memory System Gate

## Status

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

Section 16 implements provider-independent personal long-term memory while preserving fresh-conversation-by-default behavior and strict separation from execution, device, sensor and approval authority.

Authoritative architecture:

- `docs/architecture/MUDRIK_MEMORY_SYSTEM.md`
- `docs/architecture/MUDRIK_SECURITY_BASELINE.md`
- `docs/architecture/MUDRIK_SMART_COMPANION.md`
- `docs/architecture/MUDRIK_VOICE_INTERACTION.md`
- `docs/architecture/MUDRIK_20_SECTION_EXECUTION_PLAN.md`

Target boundary:

`Conversation / Explicit User Input -> Memory Policy -> Candidate Record -> Durable Memory Store -> Retrieval Policy -> Bounded Context Projection`

## Scope

- versioned account-bound memory policy;
- provider-independent long-term memory records;
- explicit-only memory capture baseline;
- fresh-conversation-by-default behavior;
- deterministic bounded topic/tag retrieval;
- conversation reconstruction inputs;
- retention/expiry enforcement;
- deletion and derivative invalidation;
- record revision/conflict/supersession handling;
- bounded context compaction;
- privacy-safe memory audit;
- storage/restart integrity;
- companion memory-policy reference integration without inherited authority.

## Explicit Non-Goals

- no Section 17 general RAG/knowledge engine;
- no provider-specific memory as source of truth;
- no hidden automatic storage of arbitrary conversation content;
- no credential/secret memory;
- no health/location/emergency data promoted into ordinary memory by default;
- no memory-derived tool approval or capability;
- no production cloud sync claim before real-environment validation;
- no claim that conversation deletion automatically equals memory deletion unless a memory source relationship explicitly requires it.

## Core Invariants

1. Long-term memory can be disabled and MUDRIK remains usable.
2. Fresh conversation is the default; old thread context is not silently merged into a new conversation.
3. Conversation history and long-term memory are distinct data classes.
4. A memory record is bound to exactly one account.
5. A memory policy is explicit, versioned and account-bound.
6. Disabled policy permits no long-term write or retrieval.
7. Explicit-only mode requires explicit approved provenance for durable writes.
8. A companion memoryPolicyId is a reference, never memory authority.
9. Model output cannot self-authorize creation, deletion or disclosure of memory.
10. Observation/sensor data does not automatically become long-term memory.
11. Credential/secret-shaped content fails closed.
12. Unknown fields and unsupported protocol versions fail closed.
13. Same record ID/revision/payload is idempotent; same revision with changed payload is conflict.
14. Newer revisions cannot change immutable account/identity provenance silently.
15. Contradictory records do not silently collapse into fabricated certainty.
16. Expired memory is not retrievable.
17. Deleted memory cannot reappear through stale index/cache/restart state.
18. Tombstones contain no deleted private content.
19. Derived index/compaction data is invalidated when its source is deleted/superseded.
20. Retrieval is category/policy/account/time bounded.
21. Retrieval count and byte size are bounded.
22. Retrieval result is advisory context only and grants zero execution/sensor/disclosure/approval authority.
23. Topic matching is deterministic for the same policy/query/record set at the Section 16 baseline.
24. Provider-specific embeddings are not required for basic correctness.
25. Compaction retains source provenance and does not silently discard explicit important facts.
26. Conflicts remain represented as conflicts through compaction.
27. Reconstruction distinguishes transcript, ephemeral context and durable memory.
28. Memory failure degrades to fresh-conversation behavior rather than fabricated context.
29. Audit events contain stable IDs/reason codes, not private memory content.
30. Same accepted state plus same ordered input yields deterministic memory state and retrieval output.

## Layer 1 — Specification / Static Correctness

Required evidence:

- strict versioned policy/record/candidate/retrieval contracts;
- explicit category and sensitivity boundary;
- explicit retention/deletion semantics;
- provider-independent repository interface;
- exact revision/conflict rules;
- exact memory-authority boundary;
- secret/credential rejection;
- bounded retrieval and compaction limits;
- privacy-safe audit schema;
- syntax/type/lint/dependency/secret gates green.

## Layer 2 — Unit / Component Verification

Mandatory cases include:

- memory disabled blocks write and retrieval;
- explicit-only write requires explicit provenance;
- wrong account/policy/category rejected;
- unknown fields/version rejected;
- duplicate record/revision idempotent;
- same-revision conflict rejected;
- stale update rejected;
- supersession rules deterministic;
- expiry enforced using trusted time;
- deletion removes retrieval eligibility;
- restart cannot revive deleted/expired memory;
- tombstone contains no private content;
- secret-shaped candidate rejected;
- retrieval exact account/category/time binding;
- deterministic tag/topic matching;
- retrieval count/byte bounds;
- fresh conversation yields no prior memory unless retrieval is requested/permitted;
- compaction preserves source IDs/revisions;
- conflicting facts are not merged into certainty;
- audit payload remains content-free.

## Layer 3 — Integration / Security / Adversarial Verification

Mandatory cases include:

- cross-account memory read/write attempt;
- copied memory policy/reference without authority;
- malicious model proposal attempting hidden memory write;
- prompt text attempting memory deletion/policy change;
- stale cache/index after delete;
- delete racing retrieval;
- update racing compaction;
- policy disable racing retrieval;
- policy revision change invalidates stale write;
- expired record present in storage but absent from retrieval;
- corrupted durable record/index fails closed;
- credential/private-key/token injection;
- oversized memory/retrieval/compaction payloads;
- duplicate/reordered updates;
- provider switch does not alter durable truth;
- companion profile cannot widen category access;
- memory projection cannot become Section 11/12 tool authority;
- reconstruction never mutates original transcript or memory records.

## Layer 4 — Real Environment / Failure / Performance

**DEFERRED** under the owner-directed real-environment exception.

Before production closure validate at minimum:

- real SQLite/device storage lifecycle;
- app kill/restart during create/update/delete;
- storage-full and low-memory behavior;
- device backup/restore policy;
- account logout/removal behavior;
- real cloud/sync behavior if introduced;
- multi-device conflict/synchronization if introduced;
- encryption-at-rest/key lifecycle where applicable;
- actual deletion propagation to every derived local/cloud index;
- real conversation reconstruction latency;
- large-memory-set retrieval latency and memory pressure;
- migration/rollback across schema versions;
- privacy/export/delete UX;
- accessibility/localization for memory controls;
- independent privacy/security review.

## Layer 5 — Evidence / Release Gate

Pre-device completion requires:

- exact accepted candidate SHA;
- Section 16 deterministic/component/adversarial tests green;
- whole Mobile Core regressions green;
- Control Plane and Computer Agent regressions green;
- Mobile Core Validation green;
- CodeQL green;
- dependency and secret gates green;
- no unresolved Blocker/Critical/High Section 16 defect;
- automated evidence and defect record;
- all real-environment obligations explicitly deferred.

## Acceptance Rule

Section 16 is pre-device complete only when durable personal memory is policy-controlled, account-isolated, deletion-safe, bounded, deterministic and provider-independent, while fresh conversation remains the safe default. Memory context may inform an interaction; it may never become execution authority.
