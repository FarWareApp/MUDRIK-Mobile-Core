# MUDRIK Knowledge Engine and Developer Knowledge System

## Purpose

Section 17 defines a provider-independent knowledge layer for MUDRIK. It retrieves source-grounded, task-relevant information without turning retrieved text, embeddings, model output or external documents into execution authority.

The durable truth boundary is:

`Authorized Source -> Provenance + Version Metadata -> Bounded Ingestion -> Provider-Independent Index -> Query/Rerank Policy -> Cited Knowledge Projection`

Section 17 is distinct from Section 16 personal long-term memory. Personal memory is account-approved user context; knowledge is source-grounded reference material. Neither class grants tool authority.

## Architecture Principles

1. Source identity and provenance are durable truth; embeddings are derived optimization.
2. Every indexed document/chunk is bound to an immutable source ID, source version, content digest and provenance record.
3. Technical/API retrieval prefers official documentation when an authoritative source is available.
4. Freshness is explicit. A stale, superseded or unavailable source cannot masquerade as current.
5. Retrieved source text is untrusted data. Prompt/tool instructions inside documents are inert.
6. Account/workspace/domain access is checked before ingestion and retrieval.
7. Cross-account or cross-workspace source disclosure fails closed.
8. Secret/credential material is not indexable.
9. Query result count and projected byte size are bounded.
10. Citation/source references accompany every projected knowledge chunk.
11. Licensing/provenance metadata is preserved through ingestion, indexing, retrieval and deletion.
12. Deleting or revoking a source invalidates all derived chunks/index entries.
13. Same source set + same index policy yields deterministic durable source/index state.
14. Provider/embedding-model changes may rebuild derived indexes but cannot rewrite source identity or provenance truth.
15. No arbitrary Web ingestion occurs without an explicit source policy.
16. Knowledge projections grant zero execution, sensor, approval or capability authority.

## Data Classes

### Knowledge Source

A source record contains at minimum:

- sourceId;
- account/workspace binding where applicable;
- source kind and canonical locator;
- publisher/owner identity when known;
- provenance type;
- content digest;
- version identifier;
- fetched/observed timestamp;
- freshness/validity state;
- licensing/use metadata;
- deletion/revocation state;
- authority flags fixed false.

### Knowledge Chunk

A chunk is derived from exactly one accepted source revision and contains:

- chunkId;
- sourceId/sourceRevision;
- deterministic ordinal/range;
- bounded text;
- content digest;
- topic/domain metadata;
- derivation/index version;
- licensing/provenance references;
- authority flags fixed false.

### Derived Index

Indexes may use lexical features, embeddings or reranking metadata. They are replaceable derived state. They must preserve source/chunk IDs and cannot become source truth.

### Knowledge Projection

Retrieval output contains only bounded task-relevant chunks plus citation/source metadata, freshness status and score/rank explanation fields needed by the calling layer. Projection text is advisory untrusted data.

## Source Policy

Source policy controls:

- accepted source kinds;
- account/workspace scope;
- canonical domain/locator allowlists where needed;
- official-source preference;
- maximum source/chunk sizes;
- freshness requirements;
- licensing requirements;
- retention/revalidation windows;
- whether remote refresh is allowed.

A source reference alone is not ingestion authority.

## Ingestion

The ingestion pipeline is deterministic and bounded:

1. validate source policy and caller binding;
2. validate source metadata/provenance;
3. reject secret-shaped or oversized input;
4. canonicalize text and metadata;
5. compute content digest;
6. assign deterministic chunks;
7. persist source revision;
8. build/replace derived index entries;
9. publish only after source and derived state agree.

A failed index build cannot partially publish a new source revision.

## Retrieval and Ranking

Retrieval is two-stage:

1. bounded candidate selection using provider-independent metadata/lexical matching and optionally embeddings;
2. bounded reranking using explicit policy signals such as exact domain match, official-source preference, freshness and task relevance.

Embeddings/rerankers may improve quality but are not required for correctness.

Technical retrieval should prefer, in order where relevant:

- official/current documentation for the requested API/version;
- first-party specifications or release notes;
- approved project-local documentation;
- other explicitly accepted sources.

Preference is not blind trust: source freshness, version match and provenance still apply.

## Freshness and Versioning

Every retrieval decision records source revision and freshness state. If a query requires current information and only stale material is available, the result must state that limitation or fail according to policy rather than presenting stale text as current.

Source updates create a new revision. Same revision + same digest is idempotent; same revision + changed digest is conflict; stale revision is rejected.

## Deletion and Revocation

Deletion/revocation creates content-free tombstone/state and invalidates:

- derived chunks;
- embeddings;
- lexical indexes;
- reranker caches;
- citation projections;
- query caches.

A stale index must not resurrect deleted source content.

## Prompt and Tool Injection Boundary

Document text, code comments, README instructions, HTML, issue text and retrieved examples are untrusted data. Strings such as “ignore policy”, “run this shell command”, hidden JSON or tool-call syntax cannot grant authority or alter Section 11/12 policy.

The Knowledge Engine returns cited context only. The caller must separately pass normal authorization and execution gates.

## Licensing and Copyright

Source records retain license/provenance/use metadata. The engine should project the minimum source text needed for the task and preserve citation references. It must not treat indexability as permission to reproduce an entire copyrighted work.

## Provider Independence

A provider adapter may supply embeddings, reranking or hosted search, but:

- provider IDs/credentials stay outside durable source records;
- provider failure degrades to provider-independent retrieval where possible;
- provider switch does not alter source identity, version or digest;
- rebuilding derived state is explicit and auditable.

## Privacy Boundary

Section 16 personal memory and Section 17 knowledge remain separate repositories/data classes. Private memory is never silently promoted into a general knowledge index. Project/private knowledge requires explicit account/workspace binding and disclosure policy.

## Deferred Real-Environment Obligations

Production closure still requires real vector/search storage, real documentation sources and network refresh, provider outage/fallback behavior, large-corpus performance, storage corruption/rebuild, migrations, source-removal propagation, licensing review and independent security/privacy testing.
