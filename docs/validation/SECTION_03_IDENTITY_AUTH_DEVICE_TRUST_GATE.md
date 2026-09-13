# Section 03 — Account Identity, Authentication and Device Trust Gate

## Status

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT GATE DEFERRED`

Validated pre-device candidate:

`5726fc059698ebb36590f8980c862f83099fb00b`

Evidence:

- Mobile Core Validation run #159 / ID `34766097157`: **SUCCESS**;
- CodeQL Security Analysis run #52 / ID `34766097108`: **SUCCESS**;
- Mobile / Security / Identity regressions: **101/101 PASS**;
- Expo Doctor: **21/21 PASS**;
- Computer Agent Phase 0: **10/10 PASS**;
- dependency audit: **0 Critical / 0 High / 2 reviewed Moderate**;
- full Git-history secret scan: **PASS**.

Detailed evidence:

- `docs/validation/SECTION_03_AUTOMATED_EVIDENCE.md`
- `docs/validation/SECTION_03_DEFECTS.md`

Section 01 remains open because physical Android validation is deferred. Section 02 is pre-device complete. Section 03 has completed Layers 1–3 and the automation-applicable portion of Layer 5, but remains open until applicable real-platform/backend Layer 4 obligations are satisfied.

## Scope

Section 03 implements enforceable pre-device foundations for:

- account/session identity contracts;
- passkey-first authentication architecture;
- explicit authentication-assurance levels;
- step-up policy for sensitive actions;
- device identity and key-binding contracts;
- pairing challenge policy;
- device/session revocation;
- session inventory semantics;
- short-lived access/session rules;
- refresh-family/reuse policy contracts;
- recovery threat model;
- privacy-safe identity/security telemetry.

## Non-goals

This section does not yet enable:

- production account signup/login;
- live WebAuthn/passkey ceremonies;
- production passwords;
- production access/refresh tokens;
- backend token databases;
- Android/iOS hardware-key adapters;
- production recovery/support tooling;
- Control Plane device registration;
- any private signing key committed to source.

## Layer 1 — Specification and Static Correctness

Pre-device result: **PASS**.

Verified evidence includes:

- `MUDRIK_IDENTITY_AUTH_DEVICE_TRUST.md` defines trust boundaries;
- account identity, session identity and device identity are separate;
- passkey-first architecture is documented;
- private-device-key export is absent from the key-provider contract;
- network location/IP/device label is never a trust anchor;
- authentication assurance is explicit, not boolean-only;
- critical operations cannot be silently approved by model/background state;
- session/device unknown states fail closed;
- recovery is modeled as high risk;
- TypeScript passes;
- lint passes;
- CodeQL passes;
- full-history secret scan passes;
- dependency High/Critical gate passes.

## Layer 2 — Unit and Component Verification

Pre-device result: **PASS**.

Automated coverage includes:

- canonical identity IDs accepted and malformed IDs rejected;
- session expiration handled correctly;
- revoked session rejected;
- revoked device rejected;
- device/account mismatch rejected;
- device/key mismatch rejected;
- unknown device/session states rejected;
- stale authentication requires reauthentication where policy says so;
- low/medium/high/critical step-up mapping is deterministic;
- critical action requires fresh phishing-resistant proof;
- refresh-family reuse state fails closed;
- pairing request requires exact account/source/target/key/challenge binding;
- pairing request expires;
- pairing request is one-time;
- revoked source device cannot pair a target;
- source and target identity collision is rejected;
- malformed runtime input never throws and never widens authority;
- key-provider interface exposes signing/public metadata but no private-key export;
- remote sign-out/revoke decisions affect only intended scope;
- authentication challenges are purpose/account/session/nonce bound;
- session inventory accepts only privacy-safe public security fields;
- access-session lifetime is bounded.

## Layer 3 — Integration, Security and Adversarial Verification

Pre-device result: **PASS** for implemented deterministic boundaries.

Adversarial coverage includes:

- cross-account session reuse;
- cross-device session reuse where device-bound;
- stale/expired session use;
- revoked session reuse;
- revoked device attempting pairing;
- pairing challenge replay;
- pairing challenge purpose mismatch;
- pairing challenge target-key substitution;
- malformed assurance claim claiming stronger authentication;
- refresh credential reuse/suspected-reuse state;
- downgrade attempt from required phishing-resistant step-up;
- unknown state injection;
- malformed IDs / null bytes / oversized identifiers;
- clock-boundary expiry tests;
- authentication challenge replay/substitution;
- secret-shaped field injection into session inventory;
- identity/recovery secret injection into security telemetry;
- deterministic/no-mutation policy behavior.

All tested failures resolve toward deny / reauthentication / revoked state as appropriate.

## Layer 4 — Real Platform / Backend Verification

**OPEN — DEFERRED** under the owner-directed physical-validation exception.

Before final closure verify at minimum:

- real passkey registration and sign-in on supported platforms;
- challenge/origin/RP verification against production-like backend;
- cancel/error/lost-credential flows;
- Android hardware-backed/non-exportable device keys where available;
- iOS equivalent when iOS enters release scope;
- desktop TPM/key-store behavior where supported;
- real two-device pairing;
- remote sign-out/revoke while target device is online and offline;
- refresh rotation and reuse detection using persistent backend state;
- app reinstall/upgrade/device-migration behavior;
- secure session persistence;
- key rotation;
- recovery abuse simulations;
- clock skew and temporary network failure;
- user-visible security/session inventory correctness.

Mock-only evidence cannot close hardware-backed key, passkey, revocation or backend reuse-detection requirements.

## Layer 5 — Release / Independent Review / Evidence

Automation-applicable portion: **PASS**.

Current evidence:

- exact pre-device candidate SHA recorded;
- Mobile Core Validation green on candidate;
- CodeQL green on candidate;
- Section 03 regression/adversarial tests green;
- no unresolved Critical/High Section 03 defect known;
- auth/device architecture reviewed against the project security baseline;
- recovery threat model exists;
- real-environment limitations recorded;
- security-event/logging policy redacts authenticator/recovery/session secrets.

Still mandatory before final Section 03 closure:

- complete Layer 4;
- independent auth/device security review or penetration test appropriate to the production implementation;
- verify production token/session/key/recovery implementations, not only policy primitives;
- rerun all security/release gates on the final candidate.

## Pre-Device Completion Rule

Section 03 is accepted as:

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT GATE DEFERRED`

It must **not** receive a production/freeze tag before Layer 4.

## Core Acceptance Rule

MUDRIK trusts an account/session/device only when deterministic policy can verify the exact identity binding, state, time validity and required authentication assurance.

Unknown, malformed, expired, revoked, replayed, cross-account, cross-device or insufficient-assurance state resolves to **DENY / REAUTHENTICATE / REVOKED**, never implicit trust.
