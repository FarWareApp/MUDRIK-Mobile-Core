# MUDRIK Intelligence Router and Model/Provider Layer

## Purpose

Section 18 provides a provider-independent routing layer for general reasoning, coding, vision, STT and TTS. It selects an eligible provider/model from explicit request, policy and health data without coupling MUDRIK identity, memory, knowledge, approvals or execution authority to any model vendor.

Target boundary:

`Task Intent -> Strict Intelligence Request -> Provider Registry + Health -> Deterministic Route Plan -> Provider Adapter -> Untrusted Result Envelope`

Section 18 may choose where inference happens. It may not decide whether an OS/tool action is authorized.

## Core Principles

1. MUDRIK identity is independent of every model/provider.
2. Provider credentials are adapter-private state and never appear in route plans, UI projections, audit events or model-visible context.
3. Provider registration is strict, versioned and service-scoped.
4. General, coding, vision, STT and TTS are explicit service classes.
5. Offline and online execution are explicit provider properties.
6. Online routing requires request permission and current network availability.
7. Health, quality, latency and cost are explicit routing signals.
8. Routing is deterministic for identical accepted state.
9. Unavailable or stale-health providers cannot masquerade as ready.
10. Provider/model switching never changes durable memory or knowledge truth.
11. Provider output is untrusted data with zero execution, sensor, approval or capability authority.
12. Section 11/12 remain the final local execution authority.
## Provider and Health State

Internal registration contains provider/model identity, service, offline/online mode, streaming/language support, quality, expected latency, expected cost, input bound and an adapter-private credential reference for online providers. The public descriptor omits credentialRef.

Health is separate state: provider/model identity, ready/degraded/unavailable status, observation time, measured first-result latency and recent failure rate. Health updates are monotonic by timestamp and stale health is conservatively excluded.

## Intelligence Request and Routing

Requests are account/workspace-bound and contain service, language hints, streaming requirement, input size, network availability, online permission, optimization mode, optional cost/latency ceilings, minimum quality, fallback limit and trusted request time. Requests cannot carry credentials or approvals.

Eligibility is enforced before ranking: service, input size, streaming, languages, online/network policy, health freshness/status, quality, latency and cost. Eligible candidates are ordered deterministically for balanced, quality, latency, cost or offline optimization. Stable provider/model identity is the final tie-breaker.

The route plan exposes one primary plus bounded ordered fallbacks and contains no credential references.

## Failover and Result Boundary

Failover may only move to a candidate already admitted by the original route plan. Non-retryable failures cannot fail over. After observable output, an explicit restart and generation rotation are required so outputs from different providers cannot be silently mixed. STT additionally requires replayable buffered input after capture begins.

Provider result envelopes carry provider/model provenance and bounded result references only. They remain non-authoritative; any later tool action must pass normal Section 11/12 authorization and capability gates.

## Deferred Real-Environment Obligations

Production closure still requires real online/local providers, real STT/TTS/vision adapters, credential vault/key lifecycle, rate limits/outages/timeouts, streaming interruption, measured cost/latency/quality, local model CPU/GPU/RAM pressure, concurrency/load, privacy/data-residency review and independent security testing.

## Routing Policy and Issued-Plan Provenance

Routing is account/workspace policy-bound. A versioned IntelligenceRoutingPolicy controls enabled services, which services may use online providers, allowed optimization modes, maximum fallbacks, health-age limits, latency/cost ceilings and minimum quality.

Every request carries the exact policy ID and revision. A plan is trusted only when issued by the registry and while that exact policy revision remains current. Copied structurally valid plans have no registry provenance. Updating policy invalidates older issued plans, adapter bindings, failover decisions, result acceptance and in-flight attempt output.

## Adapter and Attempt Boundary

Provider adapters receive only bounded invocation metadata and public input references. Credential references are resolved separately from the internal registry only for a currently issued plan and an admitted, non-unavailable provider/model.

Streaming output is accepted by a generation-bound attempt tracker. It enforces exact request/plan/provider/model/service/generation identity, monotonically contiguous sequence numbers, idempotent duplicate replay, terminal final closure and plan-currentness. Late output after policy invalidation fails closed.

Provider failures are normalized into stable failure codes. Provider messages are bounded and secret-shaped messages are discarded.
