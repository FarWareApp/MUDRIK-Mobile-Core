# MUDRIK Coding Engine and Autonomous Work Runner

## Purpose

Section 13 adds a provider-neutral coding orchestration layer above the durable Computer Agent and its capability sandbox.

Target boundary:

`Authorized Coding Job -> Coding Engine -> Model Adapter -> Structured Proposal -> Workflow Policy -> Section 11/12 Tool Execution -> Verification Evidence -> Reviewer -> Completion Gate`

The coding model is a reasoning component, not an authority component.

## Non-Negotiable Authority Boundary

A model response can propose:

- observations to request;
- a plan;
- bounded tool steps;
- edits;
- tests;
- diagnoses;
- repairs;
- review findings;
- a completion claim.

A model response can never:

- grant a capability;
- create or extend a permission grant;
- approve a high/critical action;
- choose a broader workspace than the admitted task;
- bypass a Section 11 durable lifecycle state;
- bypass a Section 12 tool parser, policy check or sandbox;
- mark work complete without accepted verification evidence;
- convert model/provider metadata into execution authority.

All model output is untrusted structured input.

## Section Boundary

Section 13 owns:

- coding-job contracts;
- provider-neutral model adapter contract;
- worker/reviewer role separation;
- deterministic coding workflow state;
- tool-request validation before handoff;
- iteration/revision accounting;
- verification evidence requirements;
- completion policy;
- bounded autonomous repair loops;
- fail-closed handling for malformed, stale or contradictory model output.

Section 13 does not own:

- provider selection, routing, pricing or failover — Section 18;
- provider credentials — Section 18 / secret infrastructure;
- Internet-facing task routing — Section 14;
- Web/Mobile command UI — Section 15;
- long-term memory — Section 16;
- developer knowledge ingestion/search — Section 17;
- local OS execution authority — Sections 11/12.

## Provider-Neutral Abstraction

Required shape:

`CodingEngine -> ModelAdapter -> Provider`

Section 13 depends only on a ModelAdapter contract. A ModelAdapter accepts a bounded, sanitized coding request and returns one strict structured decision.

The adapter contract must not expose provider credentials, raw transport objects or provider-specific authority metadata to the Coding Engine.

A deterministic test adapter is sufficient for pre-device validation. Production provider routing remains deferred to Section 18.

## Coding Workflow

Canonical phases:

`Understand -> Inspect -> Research -> Plan -> Implement -> Build -> Test -> Diagnose -> Repair -> Re-test -> Review -> Finish`

Not every job must perform remote research. When research is unnecessary or unavailable, the phase must be explicitly resolved as `not_required`; it must not be silently skipped.

Not every successful build requires repair. Diagnose/Repair/Re-test are entered when verification fails or review identifies a defect.

The state machine must remain deterministic for the same accepted events and trusted time.

## Revision Model

Coding work has a monotonically increasing implementation revision.

Any mutation that can change the implementation increments the revision and invalidates verification evidence tied to an older revision.

Examples:

- file edit;
- generated code change;
- dependency/project configuration change;
- repair.

A previous green test result cannot certify a newer revision.

## Worker / Reviewer Separation

Worker responsibilities:

- inspect;
- research;
- propose plan;
- request implementation tools;
- build/test;
- diagnose;
- repair.

Reviewer responsibilities:

- inspect the final candidate and evidence;
- identify defects or missing verification;
- accept or reject the candidate;
- never mutate code while acting as reviewer.

The reviewer may be another model instance, another adapter role or a deterministic reviewer in tests. Logical role separation is mandatory even when the same provider eventually serves both roles.

A reviewer rejection returns the workflow to Diagnose/Repair; it cannot be ignored by the completion gate.

## Model Decision Contract

Every model turn returns one exact decision kind from a bounded vocabulary, for example:

- `analysis`
- `request_tools`
- `plan`
- `implementation_proposal`
- `diagnosis`
- `repair_proposal`
- `review`
- `finish_claim`

Unknown kinds or fields fail closed.

Tool requests contain only Section 12 tool-step structures. Model-generated prose is never parsed as shell syntax, capability grants or approval state.

## Tool Handoff

The Coding Engine may hand a validated tool request to an injected Tool Executor boundary.

The Tool Executor must preserve the original admitted task authority. It must re-run the normal Section 11/12 authorization and sandbox path; the Coding Engine cannot provide a boolean such as `authorized: true`.

A tool result returning authority-like fields is rejected by the existing adapter-result boundary.

## Evidence Model

Completion requires evidence tied to the current implementation revision.

Baseline evidence for a changed coding job:

- implementation evidence;
- build evidence, when a build profile exists;
- test evidence;
- review evidence.

A no-code-change job may complete with inspection/review evidence if the completion policy explicitly classifies it as observation-only.

Verification evidence must record:

- stable evidence ID;
- job/session identity;
- implementation revision;
- evidence kind;
- accepted outcome;
- bounded summary code;
- trusted timestamp;
- provenance source.

Raw secrets, arbitrary full files, provider payloads and unrestricted command output do not belong in durable coding evidence.

## Completion Gate

A coding job may enter `finished` only when:

1. the workflow is in Review;
2. no tool action is in flight;
3. the candidate revision is current;
4. required verification evidence exists for that exact revision;
5. required build/test evidence is successful;
6. reviewer evidence explicitly accepts the candidate;
7. no unresolved reviewer defect remains;
8. no newer mutation invalidated the evidence;
9. the underlying durable task has not been cancelled, paused or revoked;
10. the completion claim itself grants no authority.

“Code was generated” is never completion evidence.

## Autonomous Repair Loop

Repair iterations are bounded.

The runner must have explicit maximums for:

- model turns;
- repair cycles;
- tool requests per turn/job;
- total generated decision size;
- verification retries;
- elapsed job time where an outer task policy supplies a stricter bound.

Exhaustion blocks/fails safely with a stable reason. It must not silently continue forever.

## Research

Research is a request for information, not an execution bypass.

Any external research uses a Section 12 scoped network/browser/knowledge boundary. Section 13 does not get unrestricted Internet authority merely because the model asks to research.

Provider-internal knowledge does not count as independently fetched evidence unless explicitly represented as model reasoning rather than external evidence.

## Failure and Staleness Rules

Fail closed on:

- malformed model response;
- unknown decision kind;
- wrong job/session/revision;
- stale model turn;
- duplicate conflicting decision;
- reviewer result bound to an old revision;
- verification evidence from an old revision;
- finish claim before evidence;
- tool request outside current workflow phase;
- tool request not representable by Section 12 contracts;
- repair-loop exhaustion;
- model/provider exception with no safe normalized result.

## Audit / Privacy

Coding audit events contain bounded identifiers, phase transitions, revision numbers, evidence references and stable reason codes.

They must not persist:

- provider API keys;
- secret plaintext;
- unrestricted file content;
- arbitrary stdout/stderr;
- hidden chain-of-thought;
- raw provider request/response envelopes.

## Pre-Device Validation

Section 13 automated validation must include:

- strict model-decision parser tests;
- provider-neutral adapter tests;
- workflow happy path;
- no-research explicit path;
- build/test failure -> diagnosis -> repair -> re-test;
- reviewer rejection -> repair loop;
- stale evidence after mutation;
- stale/replayed model response;
- conflicting duplicate response;
- malformed/authority-bearing model output;
- model tool request outside task capability;
- cancellation/revocation between iterations;
- tool failure normalization;
- iteration/resource exhaustion;
- finish-before-verification rejection;
- reviewer/worker role confusion rejection;
- completion on current revision only.

## Deferred Production Obligations

Before final production closure validate:

- real model-provider latency/outage behavior;
- real provider malformed-output rates;
- production model routing/failover from Section 18;
- long autonomous runs under resource pressure;
- provider compromise/red-team prompt injection;
- coding quality on representative real repositories;
- multi-language/build-system coverage;
- independent security review of model-to-tool boundaries.

## Acceptance Rule

Section 13 is pre-device complete only when an autonomous coding workflow can reason, request bounded tools, repair failures and finish from evidence while never acquiring authority outside the signed durable task and Section 12 capability sandbox.
