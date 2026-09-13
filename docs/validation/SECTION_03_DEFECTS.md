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
