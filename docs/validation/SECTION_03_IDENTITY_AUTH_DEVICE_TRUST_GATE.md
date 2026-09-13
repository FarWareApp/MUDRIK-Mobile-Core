# Section 03 — Account Identity, Authentication and Device Trust Gate

## Status

`PRE-DEVICE IMPLEMENTATION — ACTIVE`

Section 01 remains open because physical Android validation is deferred. Section 02 is pre-device complete. Section 03 may complete Layers 1–3 and automation-only Layer 5 evidence, but it remains open until applicable real-platform/backend Layer 4 obligations are satisfied.

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

Required PASS evidence:

- `MUDRIK_IDENTITY_AUTH_DEVICE_TRUST.md` exists and defines trust boundaries;
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

Mandatory deterministic tests include:

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
- remote sign-out/revoke decisions affect only intended scope.

## Layer 3 — Integration, Security and Adversarial Verification

Required adversarial cases:

- cross-account session reuse;
- cross-device session reuse where device-bound;
- forged device label/IP/network proximity trust attempt;
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
- verify policy decisions are deterministic and input objects are not mutated.

All failures must resolve toward deny / reauthentication / revoked state as appropriate.

## Layer 4 — Real Platform / Backend Verification

Deferred under the owner-directed physical-validation exception.

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

Before final Section 03 closure:

- exact candidate SHA recorded;
- Mobile Core Validation green on candidate;
- CodeQL green on candidate;
- Section 03 regression/adversarial tests green;
- no unresolved Critical/High Section 03 defect;
- auth/device threat model reviewed;
- recovery threat model reviewed;
- real-environment limitations recorded;
- security event/logging review confirms no tokens/private keys/recovery secrets logged;
- independent auth/device security review or penetration-test plan recorded;
- Layer 4 completed or explicitly not applicable.

## Pre-Device Completion Rule

Section 03 may be marked:

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT GATE DEFERRED`

only after Layers 1–3 and automation-only Layer 5 obligations are green.

It must **not** receive a production/freeze tag before Layer 4.

## Core Acceptance Rule

MUDRIK trusts an account/session/device only when deterministic policy can verify the exact identity binding, state, time validity and required authentication assurance.

Unknown, malformed, expired, revoked, replayed, cross-account, cross-device or insufficient-assurance state resolves to **DENY / REAUTHENTICATE / REVOKED**, never implicit trust.
