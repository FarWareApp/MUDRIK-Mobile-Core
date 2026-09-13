# Section 03 — Automated Evidence

## Status

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT GATE DEFERRED`

This record covers the exact pre-device candidate:

`5726fc059698ebb36590f8980c862f83099fb00b`

It does **not** close Layer 4 real-platform/backend obligations.

## CI Evidence

### Mobile Core Validation

- Workflow: `Mobile Core Validation`
- Run number: `159`
- Run ID: `34766097157`
- Head SHA: `5726fc059698ebb36590f8980c862f83099fb00b`
- Result: **SUCCESS**

Passed gates:

- frozen dependency install;
- dependency-manifest reproducibility;
- Android device-build configuration gate;
- tracked-sensitive-file gate;
- full Git-history secret scan;
- dependency High/Critical gate;
- reviewed advisory paths;
- ESLint;
- TypeScript;
- Mobile / Security / Identity regressions;
- Expo Doctor;
- Computer Agent Phase 0 regressions.

### Regression Suite

`node --test test/mobile-core/*.test.mjs`

Result:

- tests: **101**
- passed: **101**
- failed: **0**
- cancelled: **0**
- skipped: **0**

Section 03 coverage includes:

- typed internal account/device/session/key/refresh/challenge identifiers;
- phishing-resistant step-up requirements for critical actions;
- freshness limits for high/critical authentication;
- exact account/device/device-key session binding;
- revoked/expired/reauth/suspected-reuse session rejection;
- maximum access-session lifetime;
- exact device public-key thumbprint binding;
- device pending/suspended/rotation/revoked states;
- non-exportable device-key provider contract;
- refresh-family rotation and reuse detection;
- one-time pairing challenges;
- standard versus privileged pairing assurance;
- pairing account/source/target/key substitution rejection;
- revoked source-device rejection;
- source-target identity collision rejection;
- scoped remote sign-out/device/global revocation policy;
- authentication challenge purpose/account/session/nonce binding;
- challenge replay/expiry/maximum-lifetime rejection;
- safe session inventory schema;
- duplicate/current-session inventory constraints;
- identity security-event redaction;
- deterministic/no-mutation behavior in security policies.

### Expo Doctor

- checks: **21/21 PASS**
- result: no issues detected.

### Computer Agent Regression

- tests: **10/10 PASS**

This is retained because identity/security changes must not weaken the existing local-agent baseline.

### Dependency Audit

Current production dependency gate:

- Critical: **0**
- High: **0**
- Moderate: **2**, reviewed transitive advisories
- Low: **0**

Reviewed Moderate paths:

- `uuid@7.0.3` via Expo configuration tooling;
- `decode-uri-component@0.2.2` via `expo-router -> query-string`.

No incompatible override was introduced merely to silence the advisories.

### CodeQL

- Workflow: `CodeQL Security Analysis`
- Run number: `52`
- Run ID: `34766097108`
- Head SHA: `5726fc059698ebb36590f8980c862f83099fb00b`
- Result: **SUCCESS**
- JavaScript/TypeScript analysis: **PASS**

## Section 03 Security Properties Proven Pre-Device

The automated evidence proves the deterministic policy layer behaves as designed for the tested conditions. In particular:

1. Account, session and device identities are not interchangeable.
2. Network location/device labels do not create trust.
3. Critical operations cannot be satisfied by an ordinary session assurance claim.
4. Access sessions are time-bounded and exactly bound to account/device/device-key context.
5. Revoked, expired and suspected-reuse states fail closed.
6. Refresh-family replay/reuse is explicitly detectable at the policy layer.
7. Pairing cannot be authorized by QR/deep-link possession alone; exact bindings, live challenge state, authentication and approval are required.
8. MUDRIK's device-key abstraction exposes no private-key-export operation.
9. Authentication challenges are purpose-bound, one-time and short lived.
10. Session inventory rejects secret/unexpected fields rather than silently exposing them.
11. Identity/security audit metadata redacts assertions, challenge nonces, recovery secrets and session-key-like fields.
12. Runtime-malformed inputs fail closed rather than widening authority.

## Deliberately Unproven Until Layer 4

This evidence does **not** prove:

- real passkey/WebAuthn registration or authentication;
- Android Keystore/StrongBox non-exportability;
- Apple Keychain/Secure Enclave behavior;
- desktop TPM/key-store behavior;
- persistent backend refresh-family reuse detection;
- real cross-device pairing;
- remote revocation while target devices are online/offline;
- real production session/token issuance;
- recovery-service implementation;
- biometric/user-verification platform behavior;
- production key rotation;
- real server clock-skew/network-failure semantics.

Those obligations remain mandatory in Section 03 Layer 4.

## Acceptance Decision

Layers 1–3 and the automation-applicable portion of Layer 5 are accepted for candidate `5726fc059698ebb36590f8980c862f83099fb00b`.

Section 03 status is therefore:

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT GATE DEFERRED`

No production/freeze tag is authorized for Section 03 until Layer 4 is completed.
