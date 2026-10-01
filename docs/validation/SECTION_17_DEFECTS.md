# Section 17 — Defect Record

## Acceptance Summary

Implementation candidate:

a7a9d305e9af84198bddd945954e285e6d092d12

Local validation:

- frozen dependency install: PASS
- dependency audit: 0 Critical / 0 High
- lint: PASS
- TypeScript: PASS
- Section 17 knowledge suite: 30/30 PASS
- Mobile Core: 892/892 PASS
- Expo Doctor: 21/21 PASS
- Computer Agent: 184/184 PASS
- Control Plane: 59/59 PASS
- git diff --check: PASS

Hosted validation on the exact candidate passed: Mobile Core Validation #778 / 36886675072 SUCCESS; CodeQL #674 / 36886674753 SUCCESS. No known unresolved Blocker, Critical or High Section 17 defect remains in the automated/pre-device scope.

## S17-PROVENANCE-001 — Derived chunk metadata needed exact source binding

- Severity: High
- Status: Closed
- Area: provenance / licensing / derived-index integrity

### Problem

The derived-index preparation path originally bound a chunk to source ID, revision and digest, but did not independently require the chunk's official flag, version, observation time, validity time, provenance reference and license ID to equal the accepted source revision. Normal ingestion generated matching metadata, but a corrupted or substituted derived chunk could otherwise carry misleading citation/licensing metadata into a valid-looking index.

### Repair

prepareKnowledgeIndex now requires exact equality for official status, version, observedAtMs, validUntilMs, provenanceRef and licenseId in addition to source ID/revision/digest and deterministic range/ordinal constraints. Regression coverage mutates each field independently and proves publication fails closed.

## S17-DEPS-002 — New brace-expansion advisories blocked the High/Critical dependency gate

- Severity: High
- Status: Closed
- Area: dependency security / CI gate

### Problem

New September 2026 brace-expansion recursion advisories caused the hosted dependency gate to detect two High vulnerabilities. The lockfile still selected brace-expansion 1.1.18 and 5.0.9 even though patched versions remained available within the existing compatible major/range families.

### Repair

The lockfile now resolves the existing ^1.1.7 dependency path to 1.1.21 and the existing ^5.0.8 paths to 5.0.12. No incompatible cross-major override was introduced. Frozen install succeeds and the local audit reports 0 High / 0 Critical vulnerabilities.

## S17-RANKING-003 — Embedding/reranker optimization needed a strict provider-independent boundary

- Severity: Medium
- Status: Closed
- Area: ranking / provider isolation

### Problem

Section 17 required an embeddings/reranking abstraction that could improve ranking without becoming source truth or requiring a concrete Section 18 provider. Provider failure, malformed candidate IDs or score injection also needed deterministic fallback semantics.

### Repair

Added a bounded KnowledgeEmbeddingRanker contract and ranking pipeline. Provider output may adjust only already-admitted candidate IDs within a fixed score range. Unknown/duplicate IDs, invalid output and provider failure fail back to the original lexical candidates. Provider switching is regression-tested to leave durable source and chunk truth unchanged.

## Deferred Layer 4

Real vector/search storage, remote connectors, network refresh and rate limiting, production embedding/reranker providers, large-corpus performance, storage corruption/rebuild, production deletion propagation, migrations, actual source licensing review and independent security/privacy review remain mandatory before Section 20 production closure.
