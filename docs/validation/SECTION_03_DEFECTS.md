# Section 03 — Defect Record

## Current Status

No unresolved **Critical** or **High** defect is known in the Section 03 pre-device scope at candidate:

`5726fc059698ebb36590f8980c862f83099fb00b`

## Defect Handling During Development

Section 03 was developed with negative/adversarial tests before production coupling. The work did not require suppressing a security failure or accepting a known Critical/High identity defect to reach the current pre-device gate.

Hardening decisions made proactively include:

- explicit authentication-assurance levels rather than a boolean authenticated flag;
- fixed freshness bounds for high/critical step-up;
- fixed maximum access-session lifetime;
- exact account/device/device-key binding;
- explicit revoked/expired/reauth/suspected-reuse states;
- refresh-generation reuse detection;
- one-time pairing and authentication challenges;
- privileged pairing requiring phishing-resistant authentication;
- non-exportable device-key provider contract;
- account-bounded revocation policy;
- strict session-inventory field allowlist;
- additional identity/recovery secret redaction in security telemetry.

These are recorded as preventative hardening rather than defects because no accepted prior Section 03 candidate claimed the weaker behavior as valid.

## Open Validation Debt

The following are **validation debt**, not closed defects:

- real passkey/WebAuthn ceremony behavior;
- platform hardware-backed device key behavior;
- persistent backend refresh rotation/reuse detection;
- cross-device pairing;
- real remote revoke/sign-out;
- recovery implementation and abuse testing;
- production token/session issuance;
- key rotation and reinstall/migration behavior;
- independent penetration/security review of authentication/device boundaries.

A failure discovered during Layer 4 must receive a defect ID, severity, root cause, fix SHA and retest evidence before Section 03 can close.

## S03-TIME-001 — Identity freshness and expiry trusted request-controlled time

- Severity: **High**
- Status: **Closed**
- Found during: deep Section 01–06 re-audit
- Affected areas: authentication assurance, sessions, authentication challenges, pairing and revocation step-up

### Problem

Several identity decisions accepted `nowMs` inside the same untrusted decision payload and used it to evaluate freshness or expiry. Clock rollback could therefore make an old authentication, expired session/challenge or stale pairing/revocation proof appear current.

### Repair

- security-sensitive time evaluation now uses a separate trusted evaluation time;
- missing/malformed trusted time fails closed;
- session, authentication, pairing and revocation policies share the same trusted-time validation semantics;
- the former identity helper is now only a compatibility re-export of the shared core-security primitive, preventing divergent policy truth.

### Regression Evidence

Implementation family:

- `5b7ed5415ff3a1b880ba81a21062a137b097c13c` — authentication freshness;
- `ddcbb42291826330a04b2fcc451a52336cba0d15` — session validity;
- `94fdaf7a9657e72a3c843f4d54df3e9d556d7898` — authentication challenge;
- `3757826c8c3d6e0d714d32adcab3febafe8414b2` — pairing;
- `b3c87c9b75d6b39dff202da8aedcfd40891367d4` — revocation step-up;
- `df11107928df7523e4fead96eaadf63ec78fd6fc` — shared trusted-time primitive.

Dedicated rollback/freshness regressions were added across the identity test suites, including session-lifetime coverage.

