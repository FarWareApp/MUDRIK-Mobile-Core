# MUDRIK Autonomy Execution Core

Status: active internal architecture.

## Objective

MUDRIK must complete work, not merely produce plausible text. The autonomy
core therefore separates planning, authority, execution, verification,
recovery and replanning into independent fail-closed layers.

A model recommendation is never execution authority. Tool output is never
instruction authority. A claimed success is never accepted as proof by itself.

## Tool orchestration

The tool router evaluates explicit operation support, required capabilities,
tool health, trust, quality, latency, locality, side-effect support and rollback
support.

Unavailable or under-capable tools are excluded. Reversible side effects are
routed only to rollback-capable tools. Irreversible work is eligible only for a
tool that explicitly declares unrestricted side-effect support, while the
existing goal policy and approval layers remain independent blockers.

The execution coordinator preserves one idempotency key across fallback
attempts. A retryable failure before a side effect commits may fall back to the
next tool. If a side effect may already have committed, fallback stops and the
result becomes needs_reconciliation instead of risking duplicate execution.

## Dynamic replanning

A replan is a new plan generation, not an in-place mutation of history.
Completed steps are immutable. The completed prefix must be byte-equivalent in
the replacement plan, unfinished step identities cannot be recycled, plan
generation advances monotonically and amendment timestamps must be trusted.

The transactional goal kernel retains committed resource usage, receipts and
rollback state while switching only the unfinished plan suffix. Replanning is
blocked while an execution lease is active or rollback work is unresolved.

## Verification engine

Verification binds every evidence record to one goal, plan, step and result.
Evidence is freshness checked and grouped by independent source so the same
source cannot be counted twice.

Supported evidence classes include deterministic tests, state readback, tool
receipts, external truth, integrity attestation, model review and user
confirmation.

High-confidence contradictory evidence vetoes a result. Model-only proof is
forbidden by default. Side effects can require deterministic proof and state
readback. High and critical risk results require machine-verifiable evidence.

## Instruction firewall

Requester instructions and platform policy are distinguished from all retrieved
or observed content. Memory, knowledge, project state, web pages, files, tool
outputs and integration content are data, never authority.

External content cannot promote itself to requester or platform authority and
cannot directly trigger tools, execution, credential use, policy changes or
capability changes.

Requester actions can proceed to the independent capability/approval layer, but
a requester cannot self-grant credential, policy or capability authority.

## Runtime integrity

Runtime attestation verifies expected digests for critical components and
detects missing, unexpected, stale, future or rollback-generation state.

Critical integrity failure places MUDRIK into restricted mode: read and
diagnostic operations remain available, ordinary writes/execution/network and
credential operations are blocked, and only explicitly marked repair/update
recovery paths may proceed.

## Required invariants

1. No model output grants execution authority.
2. No external content grants instruction authority.
3. No retry may duplicate a possibly committed side effect.
4. No completed goal step may be rewritten by replanning.
5. No result may be considered verified solely because the producing model says
   it succeeded.
6. No runtime integrity failure may silently continue with normal authority.
7. Resource, approval, capability, rollback and deadline gates remain
   independent.

## Tool circuit breaking

Tool health is protected by an independent circuit breaker. Repeated transport,
adapter or invalid-output failures open a tool circuit for a bounded cooldown.
After cooldown, only bounded half-open probes are admitted. A successful probe
closes the circuit; a failed probe reopens it immediately.

Requester or policy denials do not count as tool-health failures. This prevents
a normal permission denial from poisoning a healthy adapter.

The execution coordinator consults the circuit before resolving an adapter, so
an unhealthy primary tool can be skipped in favor of a healthy fallback without
wasting another live attempt.

## Autonomy decision boundary

A deterministic autonomy decision layer maps execution and verification state
to one of six actions: accept result, gather more evidence, replan, rollback,
recover runtime or block.

The decision order is intentionally conservative:

1. untrusted runtime diverts to recovery or blocks;
2. exhausted deadline or resource budget blocks;
3. uncertain committed side effects roll back before any retry;
4. execution failure may replan only inside the repair budget;
5. missing evidence requests evidence rather than guessing;
6. contradictory evidence rolls back committed side effects or replans
   read-only work;
7. only verified or explicitly non-required results are accepted.

This keeps model creativity out of the final authority decision.
