# Section 12 — Computer Agent Tooling and Capability Sandbox Gate

## Status

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

Section 12 is accepted at the pre-device level only through explicit tool contracts, fail-closed capability boundaries and the evidence recorded for the accepted candidate. Adding a tool implementation is never acceptance by itself.

## Authoritative Architecture

- `docs/architecture/MUDRIK_COMPUTER_AGENT_TOOL_SANDBOX.md`
- `docs/architecture/MUDRIK_COMPUTER_AUTONOMY.md`
- `docs/architecture/MUDRIK_SECURITY_ASSURANCE_PROGRAM.md`
- `docs/architecture/MUDRIK_CONTROL_PLANE_THREAT_MODEL.md`
- `docs/architecture/MUDRIK_20_SECTION_EXECUTION_PLAN.md`
- `docs/validation/SECTION_11_DURABLE_COMPUTER_AGENT_GATE.md`

Target boundary:

`Signed Durable Task -> Strict Tool Contract -> Capability/Risk Floor -> Current Grant Recheck -> OS/Resource Sandbox -> Tool Adapter -> Sanitized Result`

## Core Invariants

1. Unknown tools, operations and input fields fail closed.
2. Tool input is parsed before policy evaluation and execution.
3. Effective risk can only increase from task declaration, never decrease.
4. Every capability has a minimum risk floor.
5. Operation-specific risk may raise the floor further.
6. Every tool exposes policy context matching the values it will actually execute.
7. A granted capability does not imply another capability.
8. Filesystem read/write/delete remain independently authorized.
9. Git write does not imply network push.
10. Terminal execution does not imply network access.
11. Without `network.outbound`, network isolation is enforced by the execution environment where the tool could otherwise open sockets.
12. A missing required sandbox backend fails closed.
13. Filesystem confinement uses canonical roots and rejects traversal/symlink escapes.
14. Mutation operations reject symlink final targets.
15. Write/delete cannot escape through a parent symlink.
16. Sensitive task input cannot carry plaintext credentials.
17. Secret use requires an opaque secret reference and current `secrets.use` authority.
18. Secret plaintext is never written into durable task/audit records.
19. Injected secret values are redacted from result/audit paths.
20. Task-supplied environment variables cannot set dangerous loader/runtime injection variables.
21. Process stop is independently authorized and cannot target arbitrary protected processes through ordinary process permission.
22. Screen capture and clipboard read receive privacy-sensitive risk floors.
23. System admin remains Critical and fresh-approval gated.
24. Every adapter has bounded time/output/input/resource limits.
25. Tool failures are typed/sanitized and do not leak host internals unnecessarily.
26. Model output, UI state and LAN proximity never grant tool authority.
27. Revocation between steps blocks the later operation.
28. Durable restart semantics from Section 11 remain intact.
29. No unauthenticated inbound shell/control port is introduced.
30. Unsupported platform guarantees remain unavailable rather than downgraded.

## Layer 1 — Specification / Static Correctness

Required:

- tool/operation schemas or exact runtime parsers;
- capability-to-tool mapping;
- capability and operation risk floors;
- policy context derivation;
- filesystem canonicalization/symlink rules;
- sandbox profile contract;
- secret-reference contract;
- bounded resource configuration;
- syntax/lint/typecheck/secret/dependency gates.

## Layer 2 — Unit / Component Verification

Required cases include:

- unknown tool/operation/input rejection;
- risk-floor enforcement;
- read/write/delete capability separation;
- path traversal rejection;
- sibling-prefix escape rejection;
- symlink root/parent/final-target rejection;
- file/output size limits;
- atomic file-write behavior;
- Git repository scope;
- destructive Git operation classification;
- process ownership/target validation;
- network capability separation;
- secret-reference parsing and no plaintext persistence;
- environment denylist;
- adapter cancellation/timeouts.

## Layer 3 — Integration / Security / Adversarial Verification

Required cases include:

- terminal network attempt without network grant;
- allowed network profile with scoped destination where supported;
- symlink swap/path race simulations;
- write/delete escape attempts;
- repository symlink escape;
- Git push without network grant;
- malicious environment injection;
- secret value echoed by child process and redaction;
- process-stop attempt against unowned/protected PID;
- revocation between tool steps;
- sandbox-backend unavailable;
- malformed adapter result;
- resource exhaustion attempts;
- restart with an in-flight tool action;
- prompt/tool injection cannot alter capability/risk.

## Layer 4 — Physical / Real-Environment Verification

**DEFERRED** under the owner-directed physical-validation exception.

Must later validate supported OS sandbox backends, real filesystem races, process trees, browser/screen/clipboard permissions, real network namespace behavior, DNS/proxy/IPv4/IPv6 escape resistance, secret stores, resource pressure and elevation behavior.

## Layer 5 — Evidence / Release Gate

Pre-device completion requires:

- exact accepted candidate SHA;
- Computer Agent tests green;
- whole Mobile Core regressions green;
- Mobile Core Validation green;
- CodeQL green;
- dependency and secret gates green;
- no unresolved Blocker/Critical/High Section 12 defect;
- automated evidence and defect record;
- every unavailable physical/platform guarantee explicitly deferred.

## Acceptance Rule

Section 12 is not complete because tools can run. It is complete at the pre-device level only when each implemented tool runs inside a verified capability, risk, path/resource and platform-isolation boundary and unsupported guarantees fail closed.
