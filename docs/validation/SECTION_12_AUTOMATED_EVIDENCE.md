# Section 12 — Automated Evidence

## Acceptance State

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

This evidence closes the automated/pre-device obligations for Section 12 only. It does not claim production-ready cross-platform sandboxing, real browser/screen/clipboard integration, real secret-store integration, production privilege elevation or independent penetration certification.

## Accepted Candidate

- Branch: `mudrik-core-v1`
- Accepted commit: `ba8204ed2646167b0fef043874d8fbdd8de5e374`
- Accepted message: `Decouple filesystem policy test from Bubblewrap`
- Primary hardening implementation immediately below it: `3e48c5668ea195c442715e0288424fd67d8d53c3` — `Harden scoped network and filesystem sandbox`

Section 12 implementation commits in the accepted chain:

- `3e0ec0f` — Add filesystem capability sandbox
- `716b30c` — Enforce Linux terminal sandbox
- `3184658` — Harden Linux terminal sandbox roots
- `e7a13d5` — Add scoped Git capability sandbox
- `af6c642` — Add opaque secret reference injection
- `1683a29` — Add owned process capability sandbox
- `6407f59` — Add fail-closed sensitive tool contracts
- `5d80a80` — Add bounded build test execution profiles
- `3e48c56` — Harden scoped network and filesystem sandbox
- `ba8204e` — Decouple filesystem policy test from Bubblewrap

## GitHub Validation Evidence

### Mobile Core Validation

- Workflow: `Mobile Core Validation`
- Run number: `#738`
- Run ID: `36370982106`
- Head SHA: `ba8204ed2646167b0fef043874d8fbdd8de5e374`
- Result: **SUCCESS**

GitHub evidence:

- tracked sensitive-file gate: **PASS**
- full Git-history secret scan: **PASS**
- dependency vulnerabilities: **0 Critical / 0 High / 2 reviewed Moderate**
- lint: **PASS**
- TypeScript: **PASS**
- Mobile Core regressions: **792/792 PASS**
- Expo Doctor: **21/21 PASS**
- Computer Agent suite: **152 tests / 128 PASS / 24 expected backend-dependent SKIP / 0 FAIL**

The GitHub-hosted runner does not provide Bubblewrap. Tests that require a real Bubblewrap backend explicitly skip there rather than silently falling back to unsandboxed execution. Backend-independent fail-closed tests still run in CI.

### Real Linux Pre-Device Validation

On the connected Pop!_OS development machine with `/usr/bin/bwrap` available:

- Computer Agent regressions: **152/152 PASS**
- Bubblewrap network namespace tests: **PASS**
- host-loopback isolation test: **PASS**
- writable/read-only mount tests: **PASS**
- filesystem symlink-swap race test: **PASS**
- Git sandbox tests: **PASS**
- owned process start/inspect/stop tests: **PASS**
- secret-reference injection/redaction tests: **PASS**
- scoped HTTPS network tests: **PASS**
- execution-profile timeout/output bounds: **PASS**
- prompt/tool-injection structural-authority test: **PASS**
- static dangerous-pattern scan: **PASS**
- worktree secret-signature scan: **PASS**
- `git diff --check`: **PASS**

### CodeQL

- Workflow: `CodeQL Security Analysis`
- Run number: `#633`
- Run ID: `36370982364`
- Head SHA: `ba8204ed2646167b0fef043874d8fbdd8de5e374`
- Result: **SUCCESS**
- JavaScript/TypeScript analysis: **PASS**

## Dependency Review

The two reviewed Moderate advisories are existing transitive dependencies in the whole-project dependency graph:

- `uuid@7.0.3` through Expo configuration/xcode tooling
- `decode-uri-component@0.2.2` through `expo-router -> query-string`

Neither creates Computer Agent execution authority. No incompatible override was introduced merely to suppress an advisory.

## Implemented Section 12 Controls

The accepted candidate provides:

- exact runtime contracts for every implemented tool operation;
- capability and operation-specific minimum risk floors;
- policy context derived from the exact values executed;
- per-step current-grant reauthorization;
- exact covering-grant binding so unrelated grants cannot widen adapter scope;
- filesystem read/write/delete capability separation;
- canonical filesystem roots, sibling-prefix defense and symlink rejection;
- no-follow bounded reads and atomic ordinary writes;
- filesystem mutations executed inside a Bubblewrap namespace;
- nested read-only mount protection over writable parent mounts;
- real directory-to-symlink race testing proving no external-root modification;
- Linux Bubblewrap terminal isolation with no shell interpolation;
- isolated network namespace for terminal/build/test/process work;
- cleaned task environment and dangerous loader/runtime variable denial;
- exact Git repository scope;
- read-only Git inspection mounts and bounded local Git writes;
- repository hooks disabled for Agent commits;
- Git network push and destructive reset/clean remain fail-closed unavailable;
- opaque `secret_ref_...` references with independent `secrets.use` authority;
- local-only secret resolution and stdout/stderr redaction;
- proof that plaintext secrets never enter durable task state;
- opaque `proc_...` ownership references rather than arbitrary PID authority;
- independently authorized process read/start/stop;
- bounded tracked-process registry and maximum process runtime;
- build/test execution profiles with fixed trusted executable families;
- bounded execution time and output;
- browser/screen/clipboard/system contracts with risk floors and fail-closed unavailable backends where guarantees are not yet proven;
- Critical `system.admin` action scope plus fresh approval requirement;
- scoped HTTPS outbound network adapter;
- exact allowed-domain matching;
- DNS resolution validation and pinning to an approved public address;
- rejection of private, loopback, link-local, multicast, documentation and mixed safe/unsafe DNS answers;
- TLS 1.2 minimum, no redirects, no user-supplied headers, no credentials/IP-literal URLs;
- wall-clock network timeout and bounded response size;
- sanitized/typed adapter results and errors;
- malformed authority-bearing adapter results fail closed;
- structural prompt/tool-injection resistance;
- no unauthenticated inbound shell/control listener.

## Adversarial Evidence Highlights

Regression coverage proves at minimum:

- unknown tools, operations and fields fail closed;
- capability substitution fails;
- task text/argv cannot manufacture new capability or risk authority;
- terminal cannot reach external or host-loopback network without a dedicated network adapter;
- missing Bubblewrap backend does not fall back to unsandboxed execution;
- filesystem traversal, sibling-prefix and static symlink escapes fail;
- concurrent directory-to-symlink swapping cannot mutate a sibling outside the granted root;
- nested read-only mount overrides a writable parent;
- Git repository symlink escape fails;
- Git push requires network authority in its contract while the unsupported push backend stays unavailable;
- malicious task environment injection fails;
- secret echo is redacted;
- wrong secret reference blocks before resolver access;
- unowned process reference cannot be inspected or stopped;
- raw PID authority is not accepted;
- process registry exhaustion is bounded;
- grant revocation between steps blocks later execution;
- in-flight restart remains `uncertain_step` instead of replaying;
- malformed adapter results fail closed;
- excessive output/response/runtime is bounded;
- scoped HTTPS blocks wrong domains, private/mixed DNS, redirects, oversize responses, timeouts and aborts.

## Closed Defects

See `docs/validation/SECTION_12_DEFECTS.md`.

No known unresolved Blocker, Critical or High Section 12 defect remains in the automated/pre-device scope at the accepted candidate.

## Deliberately Unavailable Pre-Device Capabilities

The following are not treated as implemented merely because contracts exist:

- production browser automation backend;
- real screen-capture backend;
- real clipboard backend;
- privileged system-settings/admin backend;
- Git push/force-push backend;
- destructive Git hard-reset/clean execution.

They fail closed until their platform guarantees and approval boundaries are independently implemented and validated.

## Deferred Layer 4 / Production Obligations

Before production closure, Section 12 still requires:

- Bubblewrap/user-namespace validation across every supported Linux distribution;
- equivalent sandbox guarantees for Windows/macOS before those platforms are enabled;
- longer real concurrent filesystem-race and filesystem-interruption stress;
- real process-tree/orphan termination across crash/logout/sleep;
- real browser, screen-capture and clipboard OS permission behavior;
- real OS keyring/secret-store integration;
- live DNS/proxy/IPv4/IPv6/network-escape penetration testing;
- real filesystem mount/device-file exposure review;
- CPU/memory/disk/process resource-pressure validation;
- actual privilege/elevation behavior;
- independent Computer Agent penetration/security review.

## Acceptance Rule

Section 12 is accepted only at the pre-device level. Unsupported guarantees remain unavailable rather than downgraded. Section 20 must still validate all deferred real-environment obligations before production release.
