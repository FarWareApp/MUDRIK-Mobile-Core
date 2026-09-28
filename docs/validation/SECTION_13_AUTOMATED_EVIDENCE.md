# Section 13 — Automated Evidence

## Acceptance State

PRE-DEVICE COMPLETE — OPEN / REAL-PROVIDER LAYER 4 DEFERRED

This evidence closes the automated/pre-device obligations for Section 13 only. It does not claim production provider routing, long-run autonomous reliability on representative external repositories, durable coding-session recovery across process restart, or production security certification.

## Accepted Candidate

- Branch: mudrik-core-v1
- Accepted commit: 2ecce738edc3a15b962f8c92a49934196689a75b
- Accepted message: Harden coding reviewer inspection flow

Section 13 implementation commits in the accepted chain:

- e34d4cd — Add deterministic coding workflow foundation
- bc610dc — Add autonomous coding engine runner
- 2ecce73 — Harden coding reviewer inspection flow

## GitHub Validation Evidence

### Mobile Core Validation

- Workflow: Mobile Core Validation
- Run number: #748
- Run ID: 36488827607
- Head SHA: 2ecce738edc3a15b962f8c92a49934196689a75b
- Result: SUCCESS

GitHub evidence:

- tracked sensitive-file gate: PASS
- full Git-history secret scan: PASS
- dependency vulnerabilities: 0 Critical / 0 High / 2 reviewed Moderate
- lint: PASS
- TypeScript: PASS
- Mobile Core regressions: 792/792 PASS
- Expo Doctor: 21/21 PASS
- Computer Agent suite: 184 tests / 160 PASS / 24 expected backend-dependent SKIP / 0 FAIL

The hosted GitHub runner does not provide Bubblewrap. Tests that require the real Linux backend explicitly skip there rather than silently falling back to unsandboxed execution. Backend-independent Section 13 tests run normally.

### Real Linux Pre-Device Validation

On the connected Pop!_OS development machine:

- Computer Agent regressions: 184/184 PASS
- Mobile Core regressions: 792/792 PASS
- TypeScript: PASS
- ESLint: PASS
- Expo Doctor: 21/21 PASS
- git diff --check: PASS
- tracked sensitive-file gate: PASS
- full Git-history secret scan: PASS
- dependency gate: 0 Critical / 0 High / 2 reviewed Moderate

### CodeQL

- Workflow: CodeQL Security Analysis
- Run number: #643
- Run ID: 36488827657
- Head SHA: 2ecce738edc3a15b962f8c92a49934196689a75b
- Result: SUCCESS
- JavaScript/TypeScript analysis: PASS

## Dependency Review

The two reviewed Moderate advisories are unchanged transitive dependencies in the whole-project dependency graph:

- uuid@7.0.3 through Expo configuration/xcode tooling
- decode-uri-component@0.2.2 through expo-router -> query-string

No incompatible override was introduced solely to suppress an advisory.

## Implemented Section 13 Controls

The accepted candidate provides:

- exact bounded Coding Job contracts;
- provider-neutral ModelAdapter invocation boundary;
- exact model-decision kinds and payload schemas;
- exact job/session/role/turn/revision binding;
- replay-safe and conflict-safe accepted model decisions;
- deterministic workflow phases from Understand through Finish;
- explicit required/not-required research resolution;
- monotonic implementation revision semantics;
- partial-mutation failure revision advancement;
- current-revision verification evidence only;
- issued-evidence provenance that copied objects cannot forge;
- worker/reviewer logical role separation;
- reviewer mutation prohibition;
- optional reviewer read-only inspection before verdict;
- reviewer rejection forcing Diagnose/Repair;
- finish claims that remain non-authoritative until completion policy accepts them;
- finish-decision provenance through the accepted-decision registry;
- observation-only completion policy;
- build/test verification restricted to trusted Section 12 execution profiles;
- exact Section 12 tool-step parsing before handoff;
- coding-job capability subset enforcement;
- outer durable-task capability envelope preservation;
- outer lifecycle re-checks before tool execution and completion;
- model/tool iteration and repair limits;
- verification retry limits;
- provider timeout, abort and exception normalization;
- bounded tool observations treated as untrusted data;
- authority-shaped tool result rejection;
- prompt/tool-injection resistance;
- strong model-proposed secret-signature rejection before mutation;
- no production provider credential in job, decision or coding evidence;
- no hidden chain-of-thought persisted in coding audit/evidence;
- fail-closed handling for invalid clock/lifecycle/evidence/executor boundaries.

## Adversarial Evidence Highlights

Regression coverage proves at minimum:

- malformed/unknown model decisions fail closed;
- hidden authority fields in a model-generated tool step fail closed;
- replayed or conflicting model turns fail closed;
- stale reviewer acceptance after repair fails closed;
- reviewer mutation attempts fail closed;
- reviewer may inspect only through read-only capabilities;
- a finish claim before verification fails closed;
- old green build/test evidence cannot certify a newer implementation revision;
- test failure enters Diagnose -> Repair -> Re-test;
- reviewer rejection enters Diagnose -> Repair and requires a fresh current-revision review;
- a partial mutation followed by failure advances the implementation revision before diagnosis;
- model-requested capability outside the admitted coding job is blocked before the tool executor;
- the Section 12 coding executor cannot widen the outer durable task capability envelope;
- outer Pause/Cancel/inactive lifecycle remains authoritative between model and tool iterations;
- malformed/authority-bearing tool results cannot manufacture approval;
- prompt injection returned in tool observation remains inert data;
- build/test cannot fall back to arbitrary terminal execution;
- provider failure, timeout and external abort reduce to stable safe states;
- turn, tool-request, repair and verification bounds terminate safely;
- strong credential/private-key signatures proposed for mutation are rejected before execution;
- observation-only jobs can complete without manufacturing implementation evidence.

## Closed Defects

See docs/validation/SECTION_13_DEFECTS.md.

No known unresolved Blocker, Critical or High Section 13 defect remains in the automated/pre-device scope at the accepted candidate.

## Persistence / Restart Boundary

Section 13 does not claim a separately durable coding-session journal yet.

The accepted pre-device boundary is:

- Section 11 remains the durable authority for admitted tasks and in-flight external effects;
- uncertain interrupted tool actions remain blocked from automatic replay by Section 11;
- Section 13 workflow/evidence state is deterministic within the active Coding Engine process;
- no claim is made that a Coding Engine process restart reconstructs every model turn, reviewer turn and coding evidence record.

If production requires autonomous coding sessions to resume across agent process restart, a durable Section 13 session/evidence persistence and reconstruction layer must be implemented, integrity-protected and validated before Section 20 release certification. It may not weaken Section 11 uncertain-side-effect semantics.

## Deferred Layer 4 / Production Obligations

Before production closure, Section 13 still requires:

- real model-provider latency/outage/malformed-output validation;
- Section 18 production provider routing, failover and credential isolation;
- representative real repositories, languages and build systems;
- long autonomous runs under CPU/memory/disk/network pressure;
- production-scale turn/tool/repair exhaustion tests;
- real provider compromise and prompt-injection/red-team exercises;
- representative code-quality and repair-quality evaluation;
- production secret-store/provider credential integration;
- durable coding-session recovery if restart-resume is a product requirement;
- independent security review of model-to-tool and reviewer boundaries.

## Acceptance Rule

Section 13 is accepted only at the pre-device level. The model remains non-authoritative, every tool action remains subordinate to Sections 11/12, and completion requires current-revision verification plus reviewer evidence. Section 20 must still validate every deferred real-provider/real-repository obligation before production release.
