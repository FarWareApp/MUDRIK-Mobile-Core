# Section 13 — Coding Engine and Autonomous Work Runner Gate

## Status

`PRE-DEVICE COMPLETE — OPEN / REAL-PROVIDER LAYER 4 DEFERRED`

Section 13 adds autonomous coding orchestration. Model output remains untrusted and non-authoritative.

## Authoritative Architecture

- `docs/architecture/MUDRIK_CODING_ENGINE_AUTONOMOUS_RUNNER.md`
- `docs/architecture/MUDRIK_COMPUTER_AUTONOMY.md`
- `docs/architecture/MUDRIK_COMPUTER_AGENT_TOOL_SANDBOX.md`
- `docs/architecture/MUDRIK_SECURITY_ASSURANCE_PROGRAM.md`
- `docs/architecture/MUDRIK_20_SECTION_EXECUTION_PLAN.md`
- `docs/validation/SECTION_11_DURABLE_COMPUTER_AGENT_GATE.md`
- `docs/validation/SECTION_12_COMPUTER_AGENT_TOOLING_SANDBOX_GATE.md`

Target:

`Authorized Coding Job -> Coding Engine -> Model Adapter -> Structured Proposal -> Workflow Policy -> Section 11/12 Tool Execution -> Verification Evidence -> Reviewer -> Completion Gate`

## Core Invariants

1. Model/provider output never grants authority.
2. Coding Engine never bypasses Section 11/12 execution policy.
3. Model decisions use an exact bounded structured contract.
4. Unknown decision kinds/fields fail closed.
5. Every model turn is bound to exact job, session, role, turn and implementation revision.
6. Stale/replayed/conflicting model decisions fail closed.
7. Worker and reviewer roles are logically distinct.
8. Reviewer role cannot mutate the candidate.
9. A mutation increments implementation revision.
10. Verification evidence is valid only for its exact implementation revision.
11. Old green evidence cannot certify newer code.
12. Finish requires current build/test/review evidence as applicable.
13. Reviewer rejection cannot be ignored.
14. Tool requests must be representable by existing Section 12 contracts.
15. Tool requests cannot add capabilities beyond the admitted outer task.
16. Research never implies unrestricted network/browser authority.
17. Repair/model/tool loops are bounded.
18. Tool/provider failures normalize to stable safe states.
19. No production provider secret enters repository, task state or coding evidence.
20. Coding audit/evidence never stores hidden chain-of-thought.
21. Cancellation/revocation remains authoritative between iterations.
22. Same accepted events/trusted time yield deterministic workflow state.
23. A finish claim is a claim only; completion policy independently decides.
24. Section 18 owns concrete provider routing/failover/credentials.
25. Unsupported provider/tool guarantees fail closed.

## Layer 1 — Specification / Static Correctness

Required:

- strict coding-job/session contracts;
- strict model-decision contract;
- model-adapter interface;
- deterministic workflow transitions;
- implementation revision semantics;
- evidence contract and current-revision binding;
- completion policy;
- worker/reviewer role policy;
- bounded iteration configuration;
- syntax/lint/typecheck/secret/dependency gates.

## Layer 2 — Unit / Component Verification

Required cases include:

- exact parser rejection;
- valid/invalid workflow transitions;
- revision increment/invalidation;
- evidence acceptance/rejection;
- reviewer role restrictions;
- completion evidence matrix;
- loop/resource bounds;
- adapter exception normalization.

## Layer 3 — Integration / Security / Adversarial Verification

Required cases include:

- full successful coding workflow;
- failing test -> diagnose -> repair -> re-test -> review -> finish;
- reviewer rejection -> repair;
- stale reviewer acceptance after repair;
- finish before verification;
- replayed/conflicting model turn;
- malformed authority-bearing model response;
- prompt text attempting to manufacture capabilities/approval;
- model-requested tool outside outer task capability;
- cancellation/revocation between model/tool iterations;
- tool result injection;
- provider error/timeout;
- turn/repair exhaustion;
- no plaintext provider credentials;
- restart/resume preserves current workflow revision/evidence semantics where persistence is implemented.

## Layer 4 — Real Provider / Repository Verification

**DEFERRED** under the owner-directed physical/real-environment validation exception.

Must later validate real providers, provider outages/failover, representative repositories/build systems, long autonomous runs, prompt-injection/red-team cases and production Section 18 routing.

## Layer 5 — Evidence / Release Gate

Pre-device completion requires:

- exact accepted candidate SHA;
- Section 13 regressions green;
- whole Computer Agent regressions green;
- whole Mobile Core regressions green;
- Mobile Core Validation green;
- CodeQL green;
- dependency and secret gates green;
- no unresolved Blocker/Critical/High Section 13 defect;
- automated evidence and defect record;
- every deferred provider/real-environment obligation explicit.

## Acceptance Rule

Section 13 is complete at the pre-device level only when autonomous coding can progress through the required workflow and produce a completion result backed by current-revision verification and reviewer evidence, while every tool action remains subordinate to Section 11/12 authority.
