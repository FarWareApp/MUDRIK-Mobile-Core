# MUDRIK Whole-System Integration and Security Model

## Purpose

Section 20 proves that individually hardened subsystems remain safe when composed. It is not a packaging step and it does not create new authority. The whole-system boundary is:

`Human/Trusted Session -> UI/Voice/Companion Intent -> Control Plane -> Explicit Authorization/Approval -> Durable Agent or Integration Boundary -> Capability Enforcement -> External Side Effect -> Result/Audit`

Memory, knowledge, model/provider output, vendor discovery, device presence, aliases, companion state and UI state are all non-authoritative inputs to this boundary.

Authoritative composition references:

- `docs/architecture/MUDRIK_SYSTEM_AUTHORITY_MATRIX.md`
- `docs/validation/SECTION_20_DEFERRED_LAYER4_INVENTORY.md`

## System-Wide Authority Rule

Only explicit trusted authorization artifacts and capability grants may authorize side effects. No descriptive or generative subsystem may manufacture those artifacts.

The following remain non-authoritative even when combined:

- model/provider output;
- retrieved knowledge and citations;
- long-term memory and reconstructed context;
- companion/personality state;
- voice transcript or wake-word state;
- device presence/handoff state;
- vendor discovery and device state;
- aliases, rooms, routines or automation trigger payloads;
- web/mobile presentation state;
- audit/result envelopes.

Sections 11 and 12 remain the final local computer-execution authority. Integration commands remain bound to Section 19 policy plus core capability grants.
## Composition Invariants

1. UI, voice and companion surfaces may propose intent but never grant capability.
2. Control Plane routing may deliver approved work but never manufacture local tool authority.
3. Memory retrieval may influence context only; it cannot become an approval, capability grant or integration policy.
4. Knowledge retrieval may influence context only; citation/provenance never grants execution authority.
5. Intelligence routing chooses a provider/model only; provider/model output remains untrusted data.
6. Provider switching cannot alter durable memory, knowledge, approval or capability truth.
7. Integration discovery is descriptive only; admission and command authorization remain separate.
8. Automation trigger content cannot widen routine, policy, capability or approval scope.
9. Aliases/room names are metadata and cannot replace exact target identities.
10. Approval objects require issued provenance from their owning subsystem; shape alone is insufficient.
11. Revocation at identity/session/policy/capability/binding/routine/automation layers must invalidate stale downstream projections.
12. Secrets remain referenced, never copied into model-visible, UI-visible, audit or result payloads.
13. Failure or unavailability of Memory/Knowledge/Intelligence degrades to less context/functionality, never fabricated authority.
14. Failure or unavailability of an integration/provider fails closed for side effects.
15. Time-bound artifacts are evaluated against trusted time and cannot be extended by caller timestamps.
16. Replays are idempotent only when exact semantic identity matches; changed semantics under the same ID fail closed.
17. Cross-account/workspace boundaries survive every handoff and projection.
18. Physical/emergency/high-risk actions remain subject to their specialized approval/guardian boundaries.
19. A successful result does not retroactively prove authorization; issued authorization provenance must exist before execution.
20. No stable production release tag may be created while any mandatory Layer 4 obligation remains open.
## Pre-Device Composition Matrix

Automated Section 20 testing must cover at minimum:

- model result -> capability grant rejection;
- memory record/retrieval -> capability grant rejection;
- knowledge projection -> capability grant rejection;
- vendor result/discovery -> capability grant rejection;
- provider/integration result -> approval rejection;
- policy revision invalidation across issued downstream artifacts;
- cross-account/workspace handoff rejection;
- secret-shaped value rejection across model/integration/result/audit boundaries;
- stale trusted-time artifacts rejected after expiry/revocation;
- exact replay vs semantic-conflict behavior;
- disabled/unavailable provider or integration behavior;
- automation execution proof required before automated integration command;
- high-risk access/security approval provenance;
- capability grant still required after every higher-level authorization succeeds;
- read-only context failure degrading without fabricated memory/knowledge citations;
- full Mobile, Agent and Control Plane regression suites remaining green together.

## Release State Model

Section 20 may reach a pre-device automated-composition milestone, but it cannot close the production release gate until every mandatory deferred Layer 4 obligation from Sections 01–19 is either passed on current candidate binaries/services or explicitly proven not applicable.

A production release additionally requires disaster-recovery, key-rotation, incident-response, upgrade/rollback, load/reliability, privacy/regulatory and independent security evidence. Until those exist, the repository must state clearly that production certification is incomplete.
