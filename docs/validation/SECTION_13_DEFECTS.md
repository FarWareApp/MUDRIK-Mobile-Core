# Section 13 — Defect Record

## Acceptance Summary

At accepted candidate 2ecce738edc3a15b962f8c92a49934196689a75b, there are no known unresolved Blocker, Critical or High Section 13 defects in the automated/pre-device scope.

Validation:

- Mobile Core Validation #748 / ID 36488827607: SUCCESS
- CodeQL Security Analysis #643 / ID 36488827657: SUCCESS
- real Linux Computer Agent regressions: 184/184 PASS
- GitHub Computer Agent suite: 0 FAIL with backend-dependent Bubblewrap cases explicitly skipped where unavailable
- Mobile Core regressions: 792/792 PASS
- Expo Doctor: 21/21 PASS
- dependency gate: 0 Critical / 0 High / 2 reviewed Moderate
- tracked/history secret gates: PASS

## S13-REV-001 — Partial mutation failure could leave verification on an older revision

- Severity: High
- Status: Closed
- Area: revision integrity / stale evidence

### Problem

A mutation tool can complete one or more state-changing steps before a later step fails. Treating the whole proposal as failed without mutation would leave the implementation revision unchanged and could allow older verification evidence to appear current.

### Repair

Tool execution now reports the exact completed submitted step IDs. The Coding Engine derives whether mutation occurred and advances the implementation revision before entering Diagnose when a failure follows a completed mutating step. Verification/review evidence for older revisions no longer qualifies.

## S13-FINISH-002 — Parsed finish claims needed accepted-decision provenance

- Severity: High
- Status: Closed
- Area: completion authority boundary

### Problem

A structurally valid finish_claim object should not become completion input merely because it parses. Completion needs proof that the exact decision passed the job/session/role/turn/revision replay-safe registry.

### Repair

Accepted model decisions are provenance-bound. Completion accepts only the exact registered worker finish decision. Copying an otherwise valid finish object does not satisfy the gate.

## S13-REVIEW-003 — Reviewer tool requests needed explicit read-only restriction

- Severity: High
- Status: Closed
- Area: worker/reviewer separation

### Problem

The reviewer role is allowed to inspect, but a generic request_tools shape could become a mutation path if reviewer capabilities were not separately restricted.

### Repair

Reviewer tool requests now accept only the bounded read-only capability set. Mutation/admin/process-start-stop/clipboard-write and other state-changing capabilities fail parsing or engine policy. Integration tests prove reviewer read-only inspection can precede the verdict.

## S13-STEP-004 — Nested model tool steps needed their own exact-key boundary

- Severity: High
- Status: Closed
- Area: model-to-tool authority

### Problem

Section 12 normalization validates tool input, but model-generated tool-step envelopes also need an exact outer shape so hidden authority-like fields cannot travel alongside an otherwise valid tool step.

### Repair

Section 13 now enforces an exact nested tool-step key set, bounded step identity/summary and exact Section 12 normalization. Authority-bearing hidden fields fail closed before handoff.

## S13-ADAPTER-005 — External model cancellation could race provider listener setup

- Severity: High
- Status: Closed
- Area: cancellation authority / provider adapter

### Problem

If external cancellation happened before a provider installed its own abort listener, the provider promise could remain pending until the timeout and be misclassified as model_timeout.

### Repair

The provider-neutral adapter now races an independent external-abort promise, tracks the termination reason and aborts the provider signal. Cancellation is classified deterministically as model_aborted without depending on provider listener timing.

## S13-SECRET-006 — Model-proposed source mutations needed credential-signature rejection

- Severity: High
- Status: Closed
- Area: secret leakage

### Problem

A model can generate source/config content. Even with provider credentials isolated, blindly accepting a strong credential/private-key signature in a mutation proposal could commit or persist a secret-like value into the workspace.

### Repair

A bounded recursive secret-signature guard rejects strong credential/private-key patterns before mutation execution. The repository test fixture constructs synthetic patterns without embedding a scannable credential literal, and the full-history secret gate remains green.

## S13-TOOL-007 — Tool-result and observation data needed an explicit non-authority boundary

- Severity: High
- Status: Closed
- Area: tool/prompt injection

### Problem

Tool output may contain attacker-controlled prose or JSON claiming reviewer acceptance, admin capability or completion. Such output must remain observation data only.

### Repair

Coding tool results use an exact bounded result contract, authority-shaped fields fail closed, and sanitized Section 12 results are serialized only as bounded observation data. Regression tests embed reviewer/admin-looking JSON and prove it does not alter workflow authority.

## S13-CLOCK-008 — Error paths required bounded failure even when trusted callbacks fail

- Severity: Medium
- Status: Closed
- Area: deterministic failure handling

### Problem

Clock rollback/failure, lifecycle callback exceptions, evidence-ID factory exceptions or tool-executor exceptions could otherwise surface as raw runtime errors or make the orchestration loop unreliable.

### Repair

The engine reduces these cases to stable blocked states, uses a safe block fallback and keeps observers non-authoritative.

## S13-ARTIFACT-009 — Development patch inserted an accidental NUL byte

- Severity: Medium
- Status: Closed
- Area: source integrity / tooling

### Problem

A patch operation inserted one literal NUL byte into a JavaScript string check, causing Git to classify the source file as binary despite Node still parsing the file.

### Repair

The NUL was replaced with the intended textual backslash-zero escape before commit. A repository-wide Computer Agent NUL scan found no additional NUL-containing source/test files, the file returned to normal JavaScript text, and regressions were rerun before acceptance.

## Deferred Layer 4

Real provider behavior, production provider routing/failover/credentials, long autonomous runs, representative external repositories/build systems, production prompt-injection/red-team work, durable coding-session restart recovery where required and independent security review remain mandatory before production closure.
