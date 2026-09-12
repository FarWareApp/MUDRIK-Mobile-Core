# Section 02 — Platform Security Foundation Gate

## Status

`PRE-DEVICE IMPLEMENTATION — OPEN`

Section 01 remains open because its physical Android matrix is deferred. Section 02 may progress under the recorded deferred-physical-validation exception, but it cannot be declared fully closed until every applicable real-environment obligation is satisfied.

## Scope

Section 02 converts the platform security baseline into enforceable primitives and repeatable verification.

Required foundations:

- canonical capability identifiers;
- deterministic default-deny authorization;
- resource/domain/background/elevation scoping;
- revoked/expired grant handling;
- scoped secret references rather than plaintext secret propagation;
- secure-storage boundary contract;
- privacy-safe security-event creation and redaction;
- supply-chain and dependency gates;
- release/build provenance foundation;
- threat-model template;
- security-review checklist;
- negative/adversarial regression tests.

## Non-goals

Section 02 does not yet implement:

- production account authentication;
- passkeys/MFA;
- production device key enrollment;
- live server authorization;
- production secret manager integration;
- Android/iOS secure-storage adapters;
- production signing keys;
- live emergency or destructive capabilities.

Those belong to later sections and must consume the Section 02 primitives rather than bypass them.

---

## Layer 1 — Specification and Static Correctness

Required PASS evidence:

- `MUDRIK_SECURITY_BASELINE.md` remains authoritative;
- `MUDRIK_SECURITY_ASSURANCE_PROGRAM.md` remains authoritative;
- capability registry is explicit and contains no wildcard authority;
- policy engine defaults to deny;
- model/AI output cannot grant capabilities;
- secret-reference format is explicit;
- secure-storage classes are explicit;
- telemetry schema forbids raw arbitrary nested payloads by default;
- TypeScript passes;
- lint passes;
- full-history secret scan passes;
- dependency High/Critical gate passes;
- build/dependency manifests remain reproducible.

A failure here blocks later layers.

## Layer 2 — Unit and Component Verification

Mandatory tests include:

- known capability accepted;
- invented capability rejected;
- no grant -> deny;
- subject mismatch -> deny;
- revoked grant -> deny;
- expired grant -> deny;
- valid later grant can still authorize;
- exact resource mismatch -> deny;
- path-prefix traversal -> deny;
- percent-encoded traversal -> deny;
- exact/subdomain allowlist behavior;
- lookalike domain -> deny;
- background execution requires explicit grant;
- elevation cannot exceed grant;
- invalid timestamp/identity -> deny;
- sensitive telemetry keys are redacted;
- bearer/JWT/API-key-like values are redacted;
- nested telemetry payloads are not logged raw;
- plaintext secrets are rejected where a secret reference is required;
- unclassified secure-storage keys are rejected.

## Layer 3 — Integration, Security and Adversarial Verification

Required adversarial cases:

- attempt wildcard capability injection;
- attempt cross-subject grant reuse;
- attempt resource-scope escape;
- attempt encoded traversal;
- attempt domain suffix confusion;
- attempt background escalation;
- attempt admin elevation from a lower grant;
- attempt revoked/expired grant reuse;
- attempt secret/log exfiltration through telemetry metadata;
- attempt unclassified data placement into secure-storage namespace;
- verify a denial never mutates grants or expands authority;
- verify policy decisions remain deterministic for identical inputs.

Future integrations must call the policy engine after untrusted/model input and before real-world effects.

## Layer 4 — Real Environment / Physical / Infrastructure Verification

Deferred where actual platform/infrastructure is required.

Before final closure, verify at minimum:

- Android hardware-backed secure-storage adapter behavior on supported hardware;
- iOS secure-storage adapter when iOS support enters release scope;
- desktop TPM/key-store adapter where supported;
- credential invalidation and revocation in real runtime;
- app reinstall/upgrade behavior for secure local keys;
- production-like secret-manager access without plaintext logging;
- actual artifact-signature verification and failed-signature rejection;
- network/service failure does not broaden authorization;
- kill/revoke operations remain effective during partial outages.

No mock-only result can close a hardware-backed storage or signing requirement.

## Layer 5 — Release, Independent Review and Evidence

Required before Section 02 is closed:

- exact candidate SHA recorded;
- all applicable CI gates green;
- security regression suite green;
- no unresolved Critical/High defect in Section 02 scope;
- threat model reviewed;
- security checklist complete;
- dependency/advisory disposition recorded;
- artifact provenance/signing plan reviewed;
- secure-storage adapter limitations recorded;
- independent security review plan exists for cryptographic/authentication boundaries;
- deferred Layer 4 items completed or explicitly marked not applicable;
- status documentation updated.

## Core Acceptance Rule

A capability is allowed only when deterministic policy can prove that a valid, non-revoked, non-expired grant covers the exact requested action and scope.

Unknown, malformed, ambiguous, out-of-scope or unverifiable authority resolves to **DENY**.

No AI model, companion personality, prompt, UI state or transport session may create, widen or self-approve authority.
