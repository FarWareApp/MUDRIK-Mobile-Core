# MUDRIK Memory System

## Purpose

Section 16 defines MUDRIK's provider-independent long-term memory layer.

Memory exists to reconstruct relevant user context without forcing every conversation to become one endless thread. A new conversation is fresh by default. Prior context is retrieved only when the memory policy permits it and the current subject makes it relevant.

Memory is not execution authority, device trust, sensor permission, approval truth, account identity or model-provider state.

Target boundary:

`Conversation / Explicit User Input -> Memory Policy -> Candidate Record -> Durable Memory Store -> Retrieval Policy -> Bounded Context Projection`

## Data Classes

MUDRIK keeps these concepts separate:

1. Conversation history — visible user conversation records and messages.
2. Ephemeral context — current-session pronouns/entities/short-lived working context.
3. Long-term memory — durable facts/preferences explicitly permitted by memory policy.
4. Retrieval projection — a bounded read-only set of relevant memory records supplied to an interaction.
5. Knowledge/RAG — Section 17, not personal memory.
6. Model-provider memory — not authoritative and not used as MUDRIK's source of truth.

Deleting or archiving a visible conversation does not silently create or preserve long-term memory. Long-term memory requires its own policy and provenance.

## Memory Categories

Initial non-sensitive categories:

- communication_preference;
- language_preference;
- routine;
- project;
- device_alias;
- smart_home_preference;
- recurring_task;
- companion_style_preference.

Sensitive or special-purpose information is not automatically promoted into ordinary long-term memory. Health, precise location, emergency, credentials/secrets and similarly sensitive classes require their own stricter policy or remain outside this general memory store.

Credentials, authentication tokens, private keys and secret references must never become long-term memory content.

## Memory Policy

A memory policy is account-bound and versioned.

Core modes:

- disabled — no long-term memory write or retrieval;
- explicit_only — only an explicit user-approved memory candidate may be stored;
- assisted — MUDRIK may propose candidates, but the policy still controls allowed categories and sensitive classes remain fail-closed.

The initial implementation must support disabled and explicit_only safely. Assisted capture may be enabled only after deterministic candidate/provenance controls exist.

Policy controls include:

- allowed categories;
- default retention duration;
- per-category retention overrides;
- whether automatic retrieval is enabled;
- maximum retrieval count;
- maximum context bytes;
- whether conversation reconstruction may consult long-term memory.

Policy changes never retroactively broaden records that were stored under a narrower policy.

## Record Model

Every durable memory record carries at minimum:

- memory ID;
- account ID;
- category;
- bounded normalized content;
- source/provenance reference;
- creation time;
- update time;
- retention/expiry time;
- revision;
- state;
- policy ID + policy revision under which it was accepted;
- confidence/source mode where applicable;
- explicit user approval reference for explicit-only records.

A memory record grants zero execution, sensor, disclosure, device or approval authority.

## Provenance

Memory must be attributable.

Possible source classes:

- explicit_user_statement;
- explicit_user_memory_request;
- conversation_reference;
- project_reference;
- imported_user_data.

A model-generated summary is not equivalent to user approval. Compaction or summarization must retain source references and must never invent a fact that was absent from accepted source records.

## Fresh Conversation Default

Starting a new conversation creates no implicit carry-over of the previous thread.

A retrieval request may return relevant records when:

- the account and memory policy match;
- retrieval is enabled;
- the category is allowed;
- the record is active and unexpired;
- the current topic/query is sufficiently relevant according to deterministic pre-provider rules or a later Section 17 retrieval component;
- the result fits count/byte limits.

A retrieval projection is advisory context only. It cannot authorize a tool, device, sensor, payment, emergency action, secret disclosure or approval.

## Topic Matching

Section 16 owns deterministic memory filtering and relevance contracts.

Initial topic matching should support normalized lexical tags/terms and explicit project/entity references. Embeddings, reranking and general RAG infrastructure belong to Section 17.

Provider-specific embeddings must not become required for basic memory correctness.

## Conflict and Version Handling

Same memory ID with the same revision and identical payload is idempotent.

Same revision with different payload is a conflict and fails closed.

A newer revision must preserve immutable identity/account/category provenance constraints unless an explicit migration/update rule permits the change.

Contradictory facts do not silently overwrite each other. The store must expose conflict/supersession state and keep enough provenance to explain which record is current.

## Retention and Deletion

Retention is technically enforced, not only documented.

Expired records are not retrievable.

Deletion must remove:

- the durable memory record;
- derived searchable terms/index entries;
- cached retrieval projections;
- compacted derivative records that depend solely on the deleted record, or mark them invalid until safely rebuilt.

Where replay/tombstone protection is required, a tombstone may retain only stable identifiers and deletion metadata, never the deleted private content.

A deleted record must not reappear after restart due to stale cache or index state.

## Compaction

Compaction exists to reduce context size, not to erase meaning silently.

Rules:

- only active permitted records may be compacted;
- source record IDs and revisions remain attributable;
- important explicitly approved facts are not dropped merely to meet a token budget;
- conflicting records are not merged into a fabricated certainty;
- compacted output is bounded and non-authoritative;
- deleting or superseding a source invalidates dependent compaction.

## Privacy and Compartmentalization

Memory access is account-bound.

One category does not imply access to another.

Companion profile memoryPolicyId remains a reference only; it does not grant memory access.

Observation/sensor data does not become memory merely because it was observed. Existing privacy/retention policy remains authoritative.

Memory must reject strong secret signatures, credential-shaped values and hidden authority fields.

## Provider Independence

The durable store and policy are local/provider-neutral contracts.

A model provider may receive only the bounded retrieval projection necessary for the current interaction when policy allows external processing. No provider-side memory feature is treated as the authoritative MUDRIK store.

Switching providers must not destroy, fork or silently duplicate user memory.

## Conversation Reconstruction

Conversation reconstruction may combine:

- explicit visible conversation history;
- ephemeral current-session context;
- a bounded memory retrieval projection.

Each component remains identifiable so the UI/runtime can distinguish prior transcript from durable memory.

Reconstruction cannot rewrite original conversation records or create new long-term memory without the memory-write path.

## Audit

Memory audit events use stable IDs, category, action and reason codes.

Audit must not copy private memory content.

Relevant actions include:

- policy_changed;
- memory_created;
- memory_updated;
- memory_superseded;
- memory_deleted;
- memory_expired;
- retrieval_performed;
- retrieval_denied;
- compaction_created;
- compaction_invalidated.

## Failure Behavior

When memory policy, integrity, account binding, retention state or provenance cannot be verified, fail toward no memory access.

If the memory subsystem is unavailable, a conversation remains usable as a fresh conversation without long-term memory.

No memory failure may silently broaden tool or disclosure authority.

## Section Boundaries

Section 16 does not implement:

- general knowledge/RAG indexes — Section 17;
- model/provider routing — Section 18;
- smart-home automation authority — Section 19;
- production whole-system certification — Section 20.

Section 16 must integrate without weakening Sections 3, 4, 6, 11, 12, 14 or 15.
