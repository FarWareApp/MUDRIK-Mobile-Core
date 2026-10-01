# Section 17 — Automated Evidence

## Acceptance State

PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED

This evidence covers the deterministic and automated pre-device obligations for Section 17 only. It does not claim production vector/search storage, real remote documentation connectors, production embedding/reranker providers, large-corpus performance, physical-device validation, licensing review of configured production sources, or independent security/privacy review.

## Candidate

- Branch: mudrik-core-v1
- Implementation candidate: a7a9d305e9af84198bddd945954e285e6d092d12
- Candidate message: Harden Section 17 knowledge ranking and provenance

Implementation chain:

- 2ec25de — Build provenance-safe knowledge engine core
- 6421e65 — Patch brace-expansion dependency vulnerabilities
- a7a9d30 — Harden Section 17 knowledge ranking and provenance

## Targeted Local Evidence

On the connected Pop!_OS development machine, the exact candidate passed:

- frozen Yarn dependency install: PASS
- dependency audit blocking gate: 0 Critical / 0 High
- lint: PASS
- TypeScript: PASS
- Section 17 knowledge suite: 30/30 PASS
- whole Mobile Core regressions: 892/892 PASS
- Expo Doctor 1.20.4: 21/21 PASS
- Computer Agent regressions: 184/184 PASS
- Control Plane regressions: 59/59 PASS
- git diff --check: PASS

The dependency audit reported five Moderate entries representing the already reviewed uuid/decode-uri-component advisory paths; no Critical or High advisory remains.

## Hosted Validation Evidence

### Mobile Core Validation

- Workflow: Mobile Core Validation
- Run number: 778
- Run ID: 36886675072
- Head SHA: a7a9d305e9af84198bddd945954e285e6d092d12
- Result: SUCCESS

### CodeQL

- Workflow: CodeQL Security Analysis
- Run number: 674
- Run ID: 36886674753
- Head SHA: a7a9d305e9af84198bddd945954e285e6d092d12
- Result: SUCCESS

## Implemented Section 17 Controls

The candidate provides:

- strict source, source-revision, chunk, query and projection contracts;
- account/workspace/policy-bound knowledge admission and retrieval;
- accepted source-kind, provenance and domain policy;
- official-source validation and current-documentation preference;
- deterministic bounded ingestion and chunking;
- immutable source revision identity and digest binding;
- provider-independent durable source repository and derived lexical index;
- derived-index publication only after exact source/chunk agreement;
- strict chunk binding to source official/version/freshness/provenance/license metadata;
- lexical retrieval baseline independent of embeddings;
- bounded embedding ranking abstraction with candidate-ID confinement;
- bounded reranker abstraction and safe lexical fallback;
- provider switching that cannot rewrite durable source/chunk truth;
- explicit source freshness and requested-version filtering;
- exact citation/source/provenance/license metadata on projections;
- source delete/revoke invalidation of chunks/index/projections;
- generation-bound issued projections rejecting stale or copied state;
- prompt/tool-call syntax treated as inert untrusted source text;
- secret/private-key/token-shaped content rejection;
- deterministic snapshot sealing and integrity-verified restore;
- privacy-safe content-free knowledge audit contracts;
- strict separation of Section 16 memory and Section 17 knowledge;
- zero execution, sensor, approval and capability authority on knowledge outputs.

## Adversarial Evidence Highlights

Regression coverage proves at minimum:

- malformed, unknown-field and fake-official sources fail closed;
- memory-shaped input cannot enter the knowledge repository;
- source revision duplicate/conflict/stale/gap behavior is deterministic;
- cross-account and cross-workspace ingestion/retrieval fails closed;
- stale official documentation cannot outrank an accepted current official revision;
- prompt injection and hidden tool-call syntax remain inert data;
- source deletion/revocation invalidates previously issued projections;
- asynchronous deletion and source-update races cannot publish mixed/stale source truth;
- policy changes during asynchronous ingestion prevent stale-policy publication;
- failed index build/restore cannot partially mutate durable source truth;
- corrupt source/chunk/index bindings fail closed;
- chunk provenance, license, version, freshness and official metadata must match source truth;
- failed source refresh preserves the last fully published revision;
- oversized source/chunk/query/projection input remains bounded;
- unaccepted provenance and domains fail closed;
- embedding absence, provider failure and invalid candidate injection fall back to lexical truth;
- embedding provider switching cannot rewrite source/chunk identity;
- reranker failure cannot alter durable source truth;
- requested-version filtering prevents stale-version masquerade;
- knowledge projections remain non-authoritative.

## Closed Defects

See docs/validation/SECTION_17_DEFECTS.md.

No known unresolved Blocker, Critical or High Section 17 defect remains in the automated/pre-device scope at this candidate.

## Deferred Layer 4 / Production Obligations

Before production closure Section 17 still requires:

- real vector/search/index storage lifecycle;
- real official documentation/source connectors;
- network refresh/offline/rate-limit behavior;
- embedding/reranker provider outage and fallback;
- large-corpus ingestion/retrieval latency and memory pressure;
- index corruption/rebuild and storage-full behavior;
- source deletion propagation in production stores;
- account/workspace deletion propagation;
- schema/index migrations and rollback;
- actual configured-source licensing/provenance review;
- independent security/privacy review.

## Acceptance Rule

Section 17 is accepted at the pre-device level on the exact candidate SHA above. Production closure remains deferred to the required real-environment and Section 20 gates.
