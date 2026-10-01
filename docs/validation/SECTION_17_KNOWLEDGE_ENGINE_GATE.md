# Section 17 — Knowledge Engine and Developer Knowledge System Gate

## Status

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

## Target Boundary

`Authorized Source -> Provenance/Version Metadata -> Bounded Ingestion -> Provider-Independent Index -> Query/Rerank Policy -> Cited Knowledge Projection`

Authoritative architecture:

- `docs/architecture/MUDRIK_KNOWLEDGE_ENGINE.md`
- `docs/architecture/MUDRIK_SECURITY_BASELINE.md`
- `docs/architecture/MUDRIK_20_SECTION_EXECUTION_PLAN.md`

## Scope

- strict source/source-revision/provenance contracts;
- account/workspace/domain source policy;
- deterministic bounded ingestion/chunking;
- provider-independent source repository and derived-index interface;
- official-documentation preference for technical/API tasks;
- source version/freshness handling;
- lexical retrieval baseline;
- embeddings/reranking abstraction without durable-truth coupling;
- source licensing/provenance tracking;
- cited bounded knowledge projections;
- source deletion/revocation and derivative invalidation;
- prompt/tool-injection resistance;
- privacy-safe knowledge audit.

## Explicit Non-Goals

- no Section 18 provider routing;
- no unrestricted Web crawler;
- no knowledge-derived tool/capability authority;
- no promotion of Section 16 private memory into general knowledge by default;
- no production vector database claim before real-environment validation;
- no claim that retrieved document instructions are trusted commands.

## Core Invariants

1. Knowledge sources are explicit accepted records; arbitrary retrieved text is not source truth.
2. Each source revision has immutable source identity, version and content digest.
3. Same source/revision/digest is idempotent; same revision with changed digest conflicts.
4. Stale source revisions cannot overwrite newer accepted revisions.
5. Every chunk binds exactly one source revision and deterministic range/ordinal.
6. Secret/credential-shaped material fails closed.
7. Source/account/workspace policy is checked at ingestion and retrieval.
8. Cross-account/workspace knowledge disclosure fails closed.
9. Deleted/revoked source content cannot reappear through stale index/cache state.
10. Derived embeddings/indexes are replaceable optimization, not durable source truth.
11. Provider/model switch cannot alter source identity/provenance/version.
12. Technical queries prefer official current documentation when policy accepts an applicable official source.
13. Freshness/version mismatch is explicit; stale content cannot masquerade as current.
14. Licensing/provenance metadata survives ingestion, chunking and projection.
15. Retrieval count and projected byte size are bounded.
16. Every projected chunk carries citation/source identity.
17. Retrieved text is untrusted data and cannot authorize tools, capabilities or approvals.
18. Prompt/tool syntax inside a document is inert.
19. Query/rank output is deterministic for the same source/index/query/policy baseline where no external refresh occurs.
20. Deletion/revocation invalidates derived indexes, embeddings, reranker/query caches and projections.
21. A failed new index build cannot partially publish a source revision.
22. Memory and knowledge remain separate data classes.
23. Knowledge failure degrades to no-knowledge context rather than fabricated citations.
24. Audit events contain stable IDs/reason codes, not arbitrary source text.
25. All knowledge projections grant zero execution, sensor, approval and capability authority.

## Layer 1 — Specification / Static Correctness

Required evidence:

- versioned source/source-revision/chunk/query/projection contracts;
- explicit source and workspace policy;
- deterministic chunking rules;
- provider-independent repository/index abstractions;
- source freshness/version model;
- licensing/provenance schema;
- secret rejection;
- bounded query/projection limits;
- privacy-safe audit;
- type/lint/dependency/secret gates green.

## Layer 2 — Unit / Component Verification

Mandatory cases include:

- source policy allow/deny;
- strict unknown fields/version rejection;
- source revision duplicate/conflict/stale/gap behavior;
- deterministic chunk IDs/order/ranges;
- oversized source/chunk rejection;
- secret-shaped source rejection;
- exact account/workspace binding;
- official-source preference for applicable technical query;
- freshness/version filtering;
- lexical retrieval baseline;
- embeddings disabled/unavailable still yields correct bounded behavior;
- reranker failure degrades safely;
- citation/source refs exact;
- result count/byte bounds;
- delete/revoke removes retrieval eligibility;
- index rebuild from same source set is deterministic;
- audit payload remains content-free.

## Layer 3 — Integration / Security / Adversarial Verification

Mandatory cases include:

- cross-account/workspace source read/write attempt;
- poisoned document containing prompt/tool instructions;
- hidden JSON/tool-call syntax inside retrieved text;
- stale official documentation competing with current source;
- copied/stale projection after source deletion;
- deletion racing retrieval/index rebuild;
- source update racing query;
- corrupted derived index;
- duplicate/reordered source updates;
- secret/private-key/token ingestion;
- oversized document/chunk/query/projection;
- provider/embedding switch preserving durable source truth;
- fake “official” metadata without accepted provenance;
- licensing metadata removal/mismatch;
- source refresh failure;
- retrieval projection attempting Section 11/12 authority;
- Section 16 memory cannot silently enter knowledge repository.

## Layer 4 — Real Environment / Failure / Performance

**DEFERRED** under the owner-directed real-environment exception.

Before production closure validate at minimum:

- real vector/search/index storage lifecycle;
- real official documentation/source connectors;
- network refresh/offline behavior;
- source rate limiting and remote errors;
- embedding/reranker provider outage and fallback;
- large-corpus ingestion/retrieval latency and memory pressure;
- index corruption/rebuild;
- storage-full behavior;
- source deletion propagation in real stores;
- schema/index migrations and rollback;
- licensing/provenance review on actual configured sources;
- account/workspace deletion propagation;
- independent security/privacy review.

## Layer 5 — Evidence / Release Gate

Pre-device completion requires:

- exact accepted candidate SHA;
- Section 17 deterministic/component/adversarial tests green;
- whole Mobile Core regressions green;
- Control Plane and Computer Agent regressions green;
- Mobile Core Validation green;
- CodeQL green;
- dependency and secret gates green;
- no unresolved Blocker/Critical/High Section 17 defect;
- automated evidence and defect record;
- every real-environment obligation explicitly deferred.

## Acceptance Rule

Section 17 is pre-device complete only when source truth is provenance-bound, versioned, freshness-aware, deletion-safe, bounded, provider-independent and citation-oriented. Knowledge may inform reasoning; it may never become execution authority.
