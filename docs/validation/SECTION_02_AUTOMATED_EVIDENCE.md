# Section 02 — Platform Security Foundation Automated Evidence

## Candidate

- Branch: `mudrik-core-v1`
- Validated code candidate: `256d55f2b93f33468d3c98d9e3a8192e2c584e1f`
- Validation date: 2026-09-12
- Status: **Layers 1–3 automated/pre-device evidence PASS**
- Formal section status: **OPEN — Layer 4 real-environment validation deferred**

Documentation-only evidence commits created after this candidate do not replace the code candidate. Any later code/config change must receive a new exact-SHA validation before it becomes the Section 02 candidate.

## Mobile Core Validation

- Workflow: `Mobile Core Validation`
- Run: `#133`
- Run ID: `34714989382`
- Result: **SUCCESS**

Passed gates:

- frozen dependency install;
- dependency manifest / lockfile reproducibility;
- Android device build configuration gate;
- tracked sensitive-file gate;
- full Git-history secret scan;
- dependency High/Critical vulnerability gate;
- reviewed advisory dependency paths;
- ESLint;
- TypeScript;
- Mobile + security regression tests;
- Expo Doctor;
- Computer Agent Phase 0 tests.

## Automated Test Counts

### Mobile / Platform Security

- **57 tests**
- **57 PASS**
- 0 fail
- 0 cancelled
- 0 skipped

Security-specific coverage includes:

- canonical capability registry and wildcard rejection;
- exhaustive capability risk classification;
- default-deny authorization;
- unknown capability denial;
- exact subject binding;
- revoked/expired grant denial;
- malformed grant/request fail-closed handling;
- runtime validation of `unknown` request inputs;
- exact resource ID scoping;
- non-root workspace requirement for filesystem/git/terminal authority;
- traversal, encoded path, backslash and ambiguous-separator rejection;
- exact-host network allowlisting;
- domain suffix/lookalike rejection;
- background authority requiring explicit scope;
- elevation authority requiring explicit scope;
- deterministic/non-mutating authorization decisions;
- privacy-safe security-event redaction;
- JWT/Bearer/API-key-shaped telemetry redaction;
- nested metadata suppression;
- scoped secret-reference validation;
- secure-storage namespace validation.

### Expo Doctor

- **21/21 checks PASS**
- No issues detected by Expo Doctor for the candidate.

### Computer Agent Phase 0

- **10/10 tests PASS**
- Includes default deny, scoped terminal execution, workspace boundary rejection, high/critical approval policy, path sibling-escape defense, shell-free argv execution, per-step scope re-evaluation and task-runner blocking.

## Dependency Security

Audit result:

- Critical: **0**
- High: **0**
- Moderate: **2**
- Low: **0**
- Info: **0**

Reviewed Moderate transitive advisories:

1. `uuid@7.0.3`
   - Path: Expo config tooling via `expo -> @expo/config-plugins -> xcode -> uuid`
   - Advisory: missing buffer bounds check in some UUID generation modes when an explicit buffer is provided.

2. `decode-uri-component@0.2.2`
   - Path: `expo-router -> query-string -> decode-uri-component`
   - Advisory: denial of service through pathological malformed percent-encoded input.

These advisories are not hidden or automatically overridden with incompatible versions. They remain tracked until compatible upstream dependency updates are available and validated.

## CodeQL / SAST

- Workflow: `CodeQL Security Analysis`
- Run: `#26`
- Run ID: `34714989334`
- Language: JavaScript / TypeScript
- Result: **SUCCESS**

The workflow uses a pinned CodeQL action commit rather than a floating tag.

## Supply-Chain Controls Present

- frozen `yarn.lock` dependency graph;
- manifest reproducibility gate;
- pinned GitHub Actions for trust-sensitive workflows;
- full-history secret pattern scan;
- tracked key/environment-file rejection;
- dependency High/Critical gate;
- weekly Dependabot proposals for npm and GitHub Actions;
- CODEOWNERS file for security-sensitive code paths;
- CodeQL SAST;
- traceable Android APK workflow;
- SHA-256 artifact evidence;
- build provenance attestation foundation for the manual validation APK workflow.

Dependabot proposals are review inputs, not automatically trusted/merged changes.

## Closed Defects

See `docs/validation/SECTION_02_DEFECTS.md`.

Most important closed finding:

- `S02-AUTH-001` — unscoped capability grant could have implied background/elevated authority in the first policy implementation.
- Severity: High.
- Status: Closed before production coupling.
- Fix: fail closed; missing scope defaults to foreground/non-elevated, with stronger required scopes for filesystem/git/terminal/network authority.

## Known Open / Deferred Items

Section 02 is **not production-closed** because Layer 4 is deferred.

Still required before final Section 02 closure:

- Android hardware-backed secure-storage adapter verification;
- iOS secure-storage verification when iOS enters release scope;
- desktop OS key-store / TPM behavior where supported;
- real credential invalidation and revocation;
- production-like secret-manager integration;
- production signing-key handling and signature rejection tests;
- outage/degraded-mode authorization tests against real services;
- kill/revoke verification during partial outage;
- independent security review / penetration review for cryptographic and authentication boundaries;
- production branch/ruleset protection.

## Repository Governance Gap

At validation time, `mudrik-core-v1` is not protected by an enforced GitHub branch protection/ruleset.

`CODEOWNERS` exists, but review ownership is not enforcement by itself. Before production release the repository must enforce the controls listed in `docs/validation/REPOSITORY_PROTECTION_REQUIREMENTS.md`.

## Pre-Device Decision

Section 02 **passes its pre-device Layers 1–3 evidence gate** at candidate `256d55f2b93f33468d3c98d9e3a8192e2c584e1f`.

It remains formally:

`PRE-DEVICE COMPLETE — OPEN / PHYSICAL & REAL-INFRASTRUCTURE GATE DEFERRED`

No production/freeze tag is authorized by this evidence.
