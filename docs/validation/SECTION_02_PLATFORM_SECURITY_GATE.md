# Section 02 — Platform Security Foundation Gate

## Status

`PRE-DEVICE COMPLETE — OPEN / LAYER 4 REAL-ENVIRONMENT VALIDATION DEFERRED`

Section 01 remains open because its physical Android matrix is deferred. Under the recorded deferred-physical-validation exception, Section 02 has completed its pre-device implementation and automated Layers 1–3. It is **not production-closed** because the required real hardware/infrastructure verification in Layer 4 remains deferred.

Validated security code candidate:

`256d55f2b93f33468d3c98d9e3a8192e2c584e1f`

Automated evidence:

- `Mobile Core Validation` run **#133**, ID `34714989382`: **SUCCESS**
- `CodeQL Security Analysis` run **#26**, ID `34714989334`: **SUCCESS**
- Mobile + Platform Security regressions: **57/57 PASS**
- Expo Doctor: **21/21 PASS**
- Computer Agent Phase 0: **10/10 PASS**
- Dependency audit: **0 Critical / 0 High / 2 reviewed Moderate**
- Full Git-history secret scan: **PASS**

Detailed evidence: `docs/validation/SECTION_02_AUTOMATED_EVIDENCE.md`

Defect record: `docs/validation/SECTION_02_DEFECTS.md`

## Scope

Section 02 converts the platform security baseline into enforceable primitives and repeatable verification.

Implemented foundations:

- canonical capability identifiers with no wildcard authority;
- exhaustive capability risk classification;
- deterministic default-deny authorization;
- runtime validation of untrusted request and grant objects;
- resource/domain/background/elevation scoping;
- explicit non-root workspace scope for filesystem/git/terminal authority;
- exact-host allowlists for `network.request`;
- revoked/expired grant handling;
- scoped secret references rather than plaintext secret propagation;
- secure-storage boundary contract;
- privacy-safe security-event creation and redaction;
- supply-chain and dependency gates;
- CodeQL static security analysis;
- Dependabot review inputs;
- CODEOWNERS for security-sensitive paths;
- vulnerability disclosure policy;
- release/build provenance foundation;
- threat-model template;
- security-review checklist;
- repository-protection requirements;
- negative/adversarial regression tests.

## Non-goals / Deferred Integrations

Section 02 does not yet implement:

- production account authentication;
- passkeys/MFA;
- production device key enrollment;
- live server authorization;
- production secret manager integration;
- Android/iOS secure-storage adapters;
- desktop TPM/key-store adapters;
- production signing keys;
- live emergency or destructive capabilities.

Those belong to later sections or deferred Layer 4 work and must consume the Section 02 primitives rather than bypass them.

---

## Layer 1 — Specification and Static Correctness

**Status: PASS for the validated pre-device candidate.**

Evidence:

- `MUDRIK_SECURITY_BASELINE.md` remains authoritative;
- `MUDRIK_SECURITY_ASSURANCE_PROGRAM.md` remains authoritative;
- capability registry is explicit and contains no wildcard authority;
- every canonical capability has a risk classification;
- policy engine defaults to deny;
- model/AI output cannot grant capabilities;
- secret-reference format is explicit;
- secure-storage classes are explicit;
- telemetry schema forbids raw arbitrary nested payloads by default;
- TypeScript PASS;
- lint PASS;
- full-history secret scan PASS;
- dependency gate PASS with 0 High/Critical;
- build/dependency manifests remain reproducible;
- CodeQL JavaScript/TypeScript analysis PASS.

## Layer 2 — Unit and Component Verification

**Status: PASS for the validated pre-device candidate.**

Verified behavior includes:

- known capability accepted;
- invented/wildcard capability rejected;
- no grant -> deny;
- subject mismatch -> deny;
- revoked grant -> deny;
- expired grant -> deny;
- valid later grant can still authorize;
- malformed requests/grants fail closed without throwing;
- unexpected authority fields are rejected;
- exact resource mismatch -> deny;
- non-root workspace scope required for filesystem/git/terminal;
- path traversal -> deny;
- percent-encoded/backslash/ambiguous path forms -> deny;
- network access requires an explicit allowlist;
- domain authorization is **exact-host by default**;
- implicit subdomains and lookalike suffixes -> deny;
- background execution requires explicit grant;
- elevation cannot exceed grant;
- invalid timestamp/identity -> deny;
- sensitive telemetry keys are redacted;
- bearer/JWT/API-key-like values are redacted;
- nested telemetry payloads are not logged raw;
- plaintext secrets are rejected where a secret reference is required;
- unclassified secure-storage keys are rejected;
- authorization decisions are deterministic and do not mutate caller inputs.

## Layer 3 — Integration, Security and Adversarial Verification

**Status: PASS for the current isolated/pre-device security foundation.**

Verified adversarial cases include:

- wildcard capability injection;
- cross-subject grant reuse;
- malformed runtime payloads;
- resource-scope escape;
- encoded traversal;
- domain suffix/subdomain confusion;
- background escalation;
- admin elevation from a lower grant;
- revoked/expired grant reuse;
- broad root-workspace authority attempt;
- secret/log exfiltration through telemetry metadata;
- unclassified data placement into secure-storage namespace;
- denial does not mutate grants or expand authority;
- policy decisions remain deterministic for identical inputs.

Future integrations must call the policy engine **after** untrusted/model/network input and **before** any real-world effect.

### Closed High Finding

`S02-AUTH-001` exposed a flaw in the first policy implementation: a grant without a scope could imply background/elevated authority. It was discovered during adversarial review before production coupling and was closed with regression coverage. See `SECTION_02_DEFECTS.md`.

---

## Layer 4 — Real Environment / Physical / Infrastructure Verification

**Status: DEFERRED — OPEN.**

Before final closure, verify at minimum:

- Android hardware-backed secure-storage adapter behavior on supported hardware;
- iOS secure-storage adapter when iOS support enters release scope;
- desktop TPM/key-store adapter where supported;
- credential invalidation and revocation in real runtime;
- app reinstall/upgrade behavior for secure local keys;
- production-like secret-manager access without plaintext logging;
- actual production artifact-signature verification and failed-signature rejection;
- network/service failure does not broaden authorization;
- kill/revoke operations remain effective during partial outages.

No mock-only result can close a hardware-backed storage, signing, revocation or infrastructure-failure requirement.

---

## Layer 5 — Release, Independent Review and Evidence

**Status: AUTOMATION/EVIDENCE PORTION PASS; FINAL RELEASE PORTION OPEN.**

Completed:

- exact validated code candidate SHA recorded;
- Mobile Core Validation green;
- CodeQL green;
- security regression suite green;
- no unresolved Critical/High defect currently recorded in Section 02 scope;
- threat-model template exists;
- security-review checklist exists;
- dependency/advisory disposition recorded;
- APK provenance-attestation foundation added;
- secure-storage limitations explicitly recorded;
- repository production-protection requirements documented;
- security-sensitive CODEOWNERS defined;
- private/coordinated vulnerability-reporting policy documented.

Still required before final production closure:

- deferred Layer 4 complete or explicitly not applicable;
- production secure-storage adapters verified;
- production signing and verification chain exercised;
- production branch/ruleset protection enforced;
- independent security review / penetration testing for authentication/cryptographic boundaries;
- final production candidate CI/SAST evidence;
- final status/release evidence and production milestone decision.

## Known Dependency Advisories

Two reviewed Moderate transitive advisories remain visible:

1. `uuid@7.0.3` through Expo configuration tooling;
2. `decode-uri-component@0.2.2` through `expo-router -> query-string`.

No incompatible forced dependency override is accepted merely to suppress audit output. Compatible upstream upgrades must be validated before adoption.

## Repository Governance Limitation

At this stage `mudrik-core-v1` is not protected by an enforced GitHub branch-protection/ruleset. `CODEOWNERS` is present but advisory until GitHub rules require review/status checks. This is explicitly **not production-ready governance** and is tracked in `REPOSITORY_PROTECTION_REQUIREMENTS.md`.

## Core Acceptance Rule

A capability is allowed only when deterministic policy can prove that a valid, non-revoked, non-expired grant covers the exact requested action and scope.

Unknown, malformed, ambiguous, over-broad, out-of-scope or unverifiable authority resolves to **DENY**.

No AI model, companion personality, prompt, UI state or transport session may create, widen or self-approve authority.
