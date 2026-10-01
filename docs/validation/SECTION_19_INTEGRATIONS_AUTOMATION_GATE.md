# Section 19 — Smart-Home, External Integrations and Automation Gate

## Status

`PRE-DEVICE COMPLETE — OPEN / REAL-INTEGRATION LAYER 4 DEFERRED`

## Target Boundary

`Vendor Adapter -> Untrusted Discovery -> Approved Binding -> Capability Policy -> Intent -> Authorization -> Adapter Invocation -> Result/Audit`

Authoritative architecture:

- `docs/architecture/MUDRIK_INTEGRATIONS_AUTOMATION.md`
- `docs/architecture/MUDRIK_SECURITY_BASELINE.md`
- `docs/architecture/MUDRIK_20_SECTION_EXECUTION_PLAN.md`

## Scope

- adapter framework for supported smart-home/services;
- discovery separated from admission;
- capability vocabulary and risk classes;
- device/room aliases without authority;
- safe instant commands;
- routines/scenes;
- automation permissions and bounded triggers;
- cross-device exact targeting;
- explicit high-risk approval boundaries;
- graceful unsupported-capability handling;
- adapter-private credential references.

## Core Invariants

1. Discovery never grants command authority.
2. Commands require an active account/workspace-bound admitted target.
3. Every command capability must exist in the exact admitted capability set.
4. Unknown vendor features fail as unsupported.
5. Aliases/rooms cannot replace target IDs.
6. No wildcard/broadcast command targets.
7. Low-risk instant execution is policy-controlled.
8. High-risk capability classes require explicit approval and cannot be downgraded.
9. Adapter credentials never enter public projections.
10. Routine revisions enumerate exact actions and targets.
11. Stale routine/automation revisions fail closed.
12. Automation trigger content grants zero action authority.
13. Automation frequency/time/action scope is bounded by policy.
14. Target revocation invalidates issued command/routine/automation projections.
15. Cross-device routines enumerate each target explicitly.
16. Vendor state/error payloads remain untrusted.
17. Model output may propose, never approve or grant.
18. Audit remains content/credential-minimized.
19. Results grant zero execution/sensor/approval/capability authority.
20. Automation triggers produce short-lived exact-revision executions; commands must match an exact execution action index.
21. Automation action replay under another command identity fails closed.
22. Adapter invocations are credential-free and results are accepted only against an issued invocation.
23. Result and trigger replay are idempotent only when the exact prior semantic identity matches.
24. Sections 11/12 remain final local execution authority.

## Layer 1–3 Required Evidence

Strict integration, discovery, binding, capability, policy, command, approval, routine, automation, result and audit contracts; exact-object parsing; risk-class enforcement; revision/tombstone invalidation; unsupported-capability behavior; cross-account/workspace isolation; credential isolation; deterministic routine/automation authorization; adversarial wildcard, capability-spoofing, stale-revision and high-risk downgrade tests.

## Layer 4 — Real Environment / Failure / Performance

**DEFERRED** under the owner-directed real-environment exception.

Before production closure validate real smart-home vendors/services, local hubs, device discovery churn, credential rotation/revocation, network loss, cloud outages, rate limits, device replacement, high-risk approval UX, routine partial failure/recovery, automation persistence/scheduling, cross-device latency, privacy/data-residency review and independent security review.

## Layer 5 — Evidence / Release Gate

Pre-device completion requires exact accepted candidate SHA, Section 19 deterministic/adversarial tests green, whole Mobile Core/Agent/Control Plane regressions green, Mobile Core Validation green, CodeQL green, dependency/secret gates green, no unresolved Blocker/Critical/High Section 19 defect, automated evidence/defect record, and explicit Layer 4 debt.
