# Section 12 — Defect Record

## Acceptance Summary

At accepted candidate `ba8204ed2646167b0fef043874d8fbdd8de5e374`, there are **no known unresolved Blocker, Critical or High Section 12 defects** in the automated/pre-device scope.

Validation:

- Mobile Core Validation `#738` / ID `36370982106`: **SUCCESS**
- CodeQL Security Analysis `#633` / ID `36370982364`: **SUCCESS**
- real Linux Computer Agent regressions: **152/152 PASS**
- GitHub Computer Agent suite: **0 FAIL** with backend-dependent Bubblewrap cases explicitly skipped where the hosted runner lacks Bubblewrap
- Mobile Core regressions: **792/792 PASS**
- Expo Doctor: **21/21 PASS**
- dependency gate: **0 Critical / 0 High / 2 reviewed Moderate**
- tracked/history secret gates: **PASS**

## S12-SANDBOX-001 — Linux terminal isolation lacked direct real-backend evidence

- Severity: **High**
- Status: **Closed**
- Area: execution isolation

### Problem

A policy-level sandbox abstraction was insufficient evidence that Bubblewrap arguments, network namespace, mount visibility and environment clearing behaved as intended on Linux.

### Repair

Added real Bubblewrap integration tests covering writable roots, read-only roots, network isolation, host-loopback isolation, environment clearing, canonical cwd/executable enforcement and unavailable-backend failure.

## S12-SCOPE-002 — Multiple active grants could widen adapter scope

- Severity: **High**
- Status: **Closed**
- Area: capability scope binding

### Problem

Building adapter scope from the union of all active grants could expose roots beyond the exact grant that actually satisfied policy.

### Repair

Policy now returns the covering grant identity and each adapter derives execution scope only from that exact current grant.

## S12-FS-003 — Host filesystem mutation retained a TOCTOU window

- Severity: **High**
- Status: **Closed**
- Area: filesystem race confinement

### Problem

Canonicalization and symlink checks can reject static attacks but do not alone eliminate a race where a path component changes after validation and before a host mutation.

### Repair

Production runner filesystem operations now execute through a trusted worker inside Bubblewrap with only authorized roots mounted. A real directory-to-symlink swap test repeatedly races writes and proves a sibling external sentinel is never modified.

## S12-RO-004 — Read-only child protection required explicit mount ordering

- Severity: **High**
- Status: **Closed**
- Area: sandbox mount semantics

### Problem

A protected read-only subtree nested beneath a writable root can become writable if mount ordering lets the parent bind override the child restriction.

### Repair

Writable roots mount first, then read-only roots override them. A real Bubblewrap test proves a writable sibling remains writable while the nested protected subtree rejects modification.

## S12-SECRET-005 — Secret use needed an opaque local-only injection boundary

- Severity: **High**
- Status: **Closed**
- Area: credentials / output disclosure

### Problem

Allowing secret plaintext in task input or ordinary environment fields would persist credentials and expose them to model/control-plane surfaces.

### Repair

Tasks carry only bounded `secret_ref_...` references. `secrets.use` grants exact refs. The local resolver injects plaintext only at execution and known injected values are redacted from stdout/stderr. Durable-state tests prove plaintext is absent before and after execution.

## S12-PROC-006 — Process control needed ownership rather than raw PID authority

- Severity: **High**
- Status: **Closed**
- Area: process lifecycle

### Problem

Raw PID targeting could let an ordinary process permission target unrelated/system processes and is vulnerable to PID reuse.

### Repair

Process tools accept opaque `proc_...` references. The runtime can inspect/stop only records it created, binds them to explicit grants, refuses rebinding, uses bounded background execution and enforces a tracked-process limit.

## S12-NET-007 — No safe scoped outbound network adapter existed

- Severity: **High**
- Status: **Closed**
- Area: network / SSRF

### Problem

Terminal or generic network access would be too broad, while domain-only validation without DNS controls permits SSRF/rebinding into local/private targets.

### Repair

Added an HTTPS-only network tool with exact-domain grants, DNS answer validation, public-address filtering, pinned socket resolution, SNI preservation, no redirects, no arbitrary headers, response caps and cancellation/timeout controls.

## S12-NET-008 — Network timeout was initially idle-time only

- Severity: **Medium**
- Status: **Closed**
- Area: resource bounds

### Problem

A socket idle timeout can be kept alive by a peer sending data slowly and therefore does not guarantee a maximum total operation duration.

### Repair

Added an independent wall-clock deadline in addition to request timeout behavior.

## S12-NET-009 — IPv6 literal and HEAD normalization edge cases failed strict parity

- Severity: **Medium**
- Status: **Closed**
- Area: network contract normalization

### Problem

Node URL parsing retains brackets around IPv6 host literals, and normalized HEAD requests intentionally use a zero body cap. Initial strict parsing did not account for both representations.

### Repair

Bracketed host literals now fail explicitly, IPv6 public-address policy is restricted to global-unicast space, and zero `maxBytes` is valid only for HEAD. Parser/adapter parity tests cover both cases.

## S12-RESULT-010 — Adapter output needed a separate trust boundary

- Severity: **High**
- Status: **Closed**
- Area: tool-result authority / host-detail leakage

### Problem

An adapter could return malformed, oversized, authority-bearing or secret-shaped structures, and raw backend exceptions could disclose host details.

### Repair

All adapter results cross a bounded sanitizer that rejects authority-like keys, excessive depth/size and malformed shapes. Errors are reduced to stable codes rather than arbitrary host exception text.

## S12-INJECT-011 — Prompt/tool text needed explicit structural-authority proof

- Severity: **High**
- Status: **Closed**
- Area: prompt/tool injection

### Problem

Human-readable task content and tool arguments are untrusted data and must not be able to manufacture a higher capability or risk classification.

### Repair

Tool dispatch and policy depend only on exact structural fields. Regression tests embed fake admin/capability JSON in summary/argv and prove the policy context remains the declared terminal capability. Injected tool names fail parsing.

## S12-RESOURCE-012 — Process registry resource bound lacked regression proof

- Severity: **Medium**
- Status: **Closed**
- Area: resource exhaustion

### Problem

The process runtime had a tracked-process cap but lacked an adversarial regression proving new background processes are refused when the cap is reached.

### Repair

Added a hard-limit regression that starts one owned process with `maxTracked: 1` and proves a second reference fails as `process_registry_limit`.

## S12-CI-013 — Filesystem policy test accidentally depended on local Bubblewrap availability

- Severity: **Medium**
- Status: **Closed**
- Area: CI portability / test layering

### Problem

After moving production filesystem execution into Bubblewrap, a policy-focused runner test inherited the production backend and succeeded locally but failed on GitHub's hosted runner where Bubblewrap is not installed.

### Repair

The policy test now injects a direct bounded filesystem test adapter. Real Bubblewrap behavior remains covered by dedicated backend tests that explicitly skip only when the host lacks Bubblewrap. No production fallback was added.

### Regression Evidence

Mobile Core Validation `#738` succeeded on GitHub after the repair, while the real Pop!_OS host still passes all 152 Computer Agent tests with Bubblewrap available.

## Deferred Layer 4

Cross-distribution sandbox behavior, non-Linux platform equivalents, real browser/screen/clipboard permissions, keyring integration, extended filesystem races, process-tree/orphan recovery, live network/proxy/DNS penetration, resource pressure, elevation/admin behavior and independent penetration testing remain mandatory before production closure.
