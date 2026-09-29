# Section 16 — Automated Evidence

## Acceptance State

PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED

This evidence closes the deterministic and automated pre-device obligations for Section 16 only. It does not claim production SQLite/device persistence, physical kill/restart durability, production cloud or multi-device synchronization, production encryption/key lifecycle, real privacy/export UX, or independent privacy/security review.

## Accepted Candidate

- Branch: mudrik-core-v1
- Accepted implementation commit: b367dcd277601e3c1745a58cbffdf818e8497d2f
- Accepted message: Expand Section 16 memory adversarial coverage

Accepted implementation chain:

- d64b7fd — Establish Section 16 memory system gate
- 14cb347 — Add explicit memory policy and write contracts
- 2abe414 — Build durable Section 16 memory core
- b367dcd — Expand Section 16 memory adversarial coverage

## Targeted Local Evidence

On the connected Pop!_OS development machine, the exact implementation candidate passed:

- TypeScript: PASS
- Section 16 memory contract suite: 18/18 PASS
- git diff --check: PASS before candidate commits

A full local whole-project regression was intentionally not duplicated after the final memory-only test expansion. Whole-project validation was delegated to the hosted workflow on the exact accepted SHA.

## GitHub Validation Evidence

### Mobile Core Validation

- Workflow: Mobile Core Validation
- Run ID: 36626840155
- Head SHA: b367dcd277601e3c1745a58cbffdf818e8497d2f
- Result: SUCCESS

The hosted workflow executed the repository's frozen dependency installation, reproducibility gate, Android build configuration gate, tracked sensitive-file gate, full Git-history secret scan, dependency High/Critical gate, reviewed advisory-path step, lint, TypeScript, Mobile Core security regressions, Expo Doctor, Computer Agent runtime regressions and Control Plane routing regressions.

### CodeQL

- Workflow: CodeQL Security Analysis
- Run ID: 36626840066
- Head SHA: b367dcd277601e3c1745a58cbffdf818e8497d2f
- Result: SUCCESS
- JavaScript/TypeScript analysis: PASS

## Implemented Section 16 Controls

The accepted candidate provides:

- strict versioned account-bound memory policy;
- provider-independent durable memory records;
- explicit-only write baseline with exact approval provenance;
- strict candidate, approval, record and tombstone parsing;
- secret/private-key/token/opaque-secret-reference rejection;
- deterministic canonical topic-tag normalization;
- account/policy/revision/category/time-bounded retrieval;
- bounded retrieval count and context bytes;
- trusted-time retention and expiry handling;
- content-free deletion tombstones;
- candidate replay protection that survives deletion and restart snapshots;
- deterministic policy revision/idempotency/conflict rules;
- deterministic supersession preserving old source identity/revision;
- registry-issued retrieval and compaction projection provenance;
- stale/copied projection rejection after delete, supersede or policy revision;
- deterministic compaction that preserves conflicting facts as conflict rather than fabricated certainty;
- reconstruction that keeps transcript, ephemeral context and durable memory as distinct data classes;
- fresh-conversation behavior when no memory projection is explicitly supplied;
- provider-independent repository and compare-and-swap boundary;
- canonical snapshot sealing and explicit integrity-provider verification;
- verified-object provenance before snapshot restore;
- strict account-bound restore including records, tombstones and candidate replay bindings;
- content-free privacy-safe memory audit contracts;
- exact account/policy Companion memory binding without inherited memory/category/retrieval authority;
- zero execution, sensor or tool authority on memory-derived outputs.

## Adversarial Evidence Highlights

Regression coverage proves at minimum:

- disabled policy blocks durable memory surface;
- explicit-only writes require matching candidate/policy/account/category/time approval;
- secret-shaped candidates fail closed;
- cross-account, stale-policy, wrong-candidate and wrong-category writes fail closed;
- policy duplicate/revision-conflict/stale/gap behavior is deterministic;
- candidate replay and memory-ID conflict fail closed;
- copied retrieval projection is rejected;
- deletion invalidates previously issued retrieval projections;
- fresh reconstruction still works with no durable-memory projection;
- compaction keeps contradictory facts as an explicit conflict with source IDs/revisions;
- policy changes invalidate stale compaction projections;
- direct restore of an unverified serialized snapshot fails closed;
- modified snapshot integrity fails;
- verified restart preserves tombstones and prevents deleted candidate replay;
- Companion profile cannot widen category access or manufacture retrieval authority;
- retrieval is account/category/time/count/byte/expiry bounded;
- expired memory is absent from retrieval and can be purged to a content-free retention tombstone;
- audit parser rejects injected private memory content.

## Closed Defects

See docs/validation/SECTION_16_DEFECTS.md.

No known unresolved Blocker, Critical or High Section 16 defect remains in the automated/pre-device scope at the accepted candidate.

## Deferred Layer 4 / Production Obligations

Before production closure Section 16 still requires:

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

## Acceptance Rule

Section 16 is accepted only at the pre-device level. Durable memory remains optional, explicit-policy-controlled, account-isolated, deletion-safe, bounded, provider-independent and non-authoritative. Section 20 must validate every deferred real-environment obligation before production release.
