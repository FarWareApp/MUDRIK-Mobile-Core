# MUDRIK Internal Competition Roadmap

Scope: internal capability, intelligence, reliability, security and execution.
Visual/UI work is intentionally excluded from this track.

## Competitive standard

MUDRIK is not considered strong because a feature exists. A capability is
production-grade only when it is bounded, permission-aware, observable,
recoverable, benchmarked and verified on real devices or real providers.

The internal target is a closed execution loop:

understand -> plan -> authorize -> reserve -> execute -> observe -> verify ->
repair or rollback -> prove -> finalize.

No model output grants execution authority by itself.

## Foundation already implemented

- provider-independent Intelligence Router and health-aware failover;
- adaptive multi-model deliberation and independent review;
- Benchmark Arena and regression gates;
- Brain request/stream boundary;
- capability-bound goal planning and lifecycle tracking;
- execution leases and evidence-backed receipts;
- provider execution coordinator;
- provider circuit breaker;
- rollback state machine;
- resource reservation and budget ledger;
- cryptographically pluggable integrity ledger.

## P0: complete the execution kernel

1. Bind goal admission, resource reservation, execution lease, tool invocation,
   receipt, evidence, verification and rollback into one coordinator.
2. Persist execution state so interruption, app restart and process death do not
   duplicate side effects.
3. Add idempotency keys at every external-effect boundary.
4. Require unresolved rollback obligations to block unsafe finalization.
5. Add structured retry policies with jitter, deadlines and cancellation
   propagation.

Exit criterion: crash/restart/failure injection cannot duplicate an external
side effect or report success without evidence.

## P0: real provider layer

Implement production adapters behind the existing provider contract. Each
adapter must support deadlines, cancellation, redaction, streaming validation,
usage accounting and normalized failure classification.

Provider credentials remain opaque references and must never enter UI state,
logs, benchmark artifacts or model-visible context.

Exit criterion: at least two independent providers and one privacy/local path
pass the same contract suite.

## P0: memory and context integrity

Build a Context Compiler rather than concatenating chat history. Inputs need
provenance, recency, confidence, scope, sensitivity and token-budget metadata.

Memory writes require explicit source provenance and conflict handling.
Retrieved memory must never silently override current user instructions or
trusted project state.

Add poisoning tests, stale-memory tests, cross-workspace isolation tests and
deletion propagation tests.

Exit criterion: memory improves benchmark completion without increasing
cross-user, cross-project or stale-context failures.

## P0: security hardening

Production cryptographic providers should use platform-backed keys where
available. Integrity signatures and sensitive credentials need hardware-backed
or OS-backed protection rather than JavaScript-held long-lived secrets.

Complete signed update verification, artifact provenance, SBOM generation,
dependency pinning, secret scanning, key rotation exercises and recovery drills.

Add hostile-input suites for prompt injection, tool-output injection, replay,
confused-deputy attacks, path traversal, malicious attachments and compromised
provider responses.

## P1: transactional tool runtime

Classify tools as read-only, reversible side effect or irreversible side effect.
Reversible operations need a prepared rollback path before commit.
Irreversible high-risk operations require stronger admission and explicit
approval.

Use sandboxing and least privilege for code, files, browser and device tools.
Treat every tool result as untrusted input until schema and provenance checks
pass.

Exit criterion: tool execution can be chaos-tested without corrupting project
state or crossing a capability boundary.

## P1: verification and repair

Verification must be task-specific: tests for code, source checks for research,
state reads after device actions, file hashes after writes and independent
model review when uncertainty warrants it.

Repair loops stay bounded by attempts, wall time, cost and side-effect policy.

Exit criterion: benchmark recovery rate rises without unbounded latency or
repeat actions.

## P1: observability and SLOs

Trace every request across Brain, router, provider, tool, verification and
repair boundaries without leaking prompts, credentials or sensitive payloads.

Measure p50/p95/p99 latency, provider availability, tool success, fallback rate,
repair rate, cancellation latency, cost, token usage and user intervention.

Define SLOs and error budgets before public scale. Feed routing and provider
resilience from trusted operational telemetry rather than anecdotes.

## P1: fault-injection validation

Continuously test provider timeouts, partial streams, process restarts, network
loss, stale clocks, duplicate callbacks, corrupted caches, storage-full states
and malformed tool responses.

Run fuzzing against strict parsers and state machines. Keep a regression case
for every production defect discovered.

## P2: efficiency and local intelligence

Use semantic caching only when privacy and correctness allow it. Use parallel
model execution only when expected quality gain justifies cost and latency.

Route easy work to smaller or faster models, and hard work to stronger models
or deliberation. Expand offline capability for private and latency-sensitive
tasks without claiming equal performance on every workload.

## P2: competitive evaluation

Maintain held-out multilingual suites for Arabic, German and English plus
coding, research, vision, voice, memory, computer use and long-running goals.

Compare exact versions and report raw completion, correctness, latency, cost,
recovery and intervention metrics. Do not optimize only for one aggregate score.

The release standard is measurable improvement with no material regression in
security, reliability or user effort.
