# MUDRIK Account Recovery Threat Model

## Purpose

Account recovery is one of the highest-risk identity paths because an attacker who cannot defeat passkeys or device keys may try to defeat the weaker recovery process instead.

This document defines the Section 03 threat model. It does **not** enable production recovery.

## Assets

Recovery can indirectly grant access to:

- the MUDRIK account;
- trusted-device enrollment;
- session creation;
- security settings;
- memory and user data;
- Computer Agent/control-plane authority in later sections;
- emergency/smart-home integrations in later sections.

Therefore recovery authority is not treated as ordinary customer-support functionality.

## Trust Boundaries

Separate boundaries exist between:

1. unauthenticated recovery requester;
2. authenticated account session;
3. registered passkey/authenticator;
4. trusted device identity;
5. email/SMS/federated recovery provider if later supported;
6. MUDRIK recovery service;
7. support/operator tooling;
8. security audit/notification service.

Compromise of one boundary must not automatically impersonate the others.

## Primary Threats

### Mailbox or SIM takeover

An attacker controls the email inbox or telephone number used as a fallback.

Mitigations:

- do not make email/SMS possession equivalent to an existing phishing-resistant authenticator for critical recovery;
- notify existing trusted sessions/devices where safe;
- use secondary verification or delay for high-risk changes where deployment policy requires it;
- revoke or step-up affected sessions after successful recovery.

### Stolen authenticated session

An attacker has a valid but ordinary session and changes recovery methods.

Mitigations:

- recovery-method changes require fresh strong authentication;
- ordinary session possession alone is insufficient;
- critical recovery/security changes require explicit approval and phishing-resistant authentication when available.

### Recovery-token theft or replay

An attacker obtains a recovery URL/code/challenge.

Mitigations:

- random one-time challenge;
- strict purpose binding;
- short expiration;
- consumed/revoked state;
- account binding;
- server-side replay rejection;
- no recovery secret in normal logs, analytics or AI prompts.

### Helpdesk/social-engineering attack

An attacker convinces support staff to reset the account.

Mitigations:

- no universal operator impersonation capability;
- support cannot retrieve passkeys/private device keys;
- operator actions require scoped roles and audit;
- sensitive recovery actions require dual-control/approval where operationally appropriate;
- documented identity-verification procedure;
- high-risk exceptions are rare, explicit and reviewed.

### Malicious insider

An authorized operator attempts unauthorized recovery.

Mitigations:

- least privilege;
- separation of duties;
- immutable/tamper-evident audit where practical;
- no plaintext secrets in support tooling;
- alerting on unusual recovery volume or operator patterns;
- independent incident review.

### Recovery as device-pairing bypass

An attacker recovers the account and immediately enrolls a privileged device.

Mitigations:

- recovered session may start at reduced trust;
- privileged device pairing can require additional step-up/delay/notification;
- existing device revocations and security alerts remain visible;
- pairing challenge remains one-time and device-key bound.

### Enumeration/privacy leak

Recovery UI reveals whether an email/phone/account exists.

Mitigations:

- generic external responses where appropriate;
- do not disclose unnecessary account metadata before authentication;
- rate limit and abuse monitor recovery endpoints.

### Brute force / automation

Recovery codes or endpoints are attacked at scale.

Mitigations:

- high-entropy tokens/challenges;
- bounded attempts;
- rate limits by multiple signals;
- progressive abuse controls;
- no low-entropy permanent recovery codes unless independently reviewed.

### User loses every authenticator/device

A legitimate user has no trusted factor remaining.

This is a product/recovery-policy problem, not justification for an invisible master bypass.

Possible future options must be threat-modeled individually, such as:

- pre-enrolled recovery credentials;
- verified recovery contact/process;
- delayed recovery with notifications;
- platform/provider account recovery;
- manual recovery with strong operational controls.

No option is automatically accepted merely for convenience.

## Recovery State Machine

A future production flow should use explicit states such as:

- `requested`;
- `verification_pending`;
- `cooldown_pending` where policy requires;
- `approved`;
- `consumed`;
- `revoked`;
- `expired`;
- `denied`.

Unknown states fail closed.

A consumed/expired/revoked recovery artifact cannot create another session.

## Recovery Session Consequences

A successful recovery may require:

- revoking existing refresh families;
- marking existing sessions for reauthentication;
- rotating account recovery secrets;
- re-enrolling device identity;
- notifying trusted devices/addresses;
- temporarily preventing critical security changes until policy conditions are satisfied.

Exact behavior will be selected before backend implementation.

## Logging and Privacy

Record security transitions, not recovery secrets.

Allowed examples:

- recovery requested;
- verification factor category;
- approved/denied/expired/consumed;
- actor/support role identifier where applicable;
- session/device revocations triggered;
- notification result.

Do not log:

- recovery token/code;
- passkey assertion private material;
- passwords;
- device private keys;
- biometric data;
- complete identity documents in ordinary security logs.

## Required Adversarial Tests Before Production

- reuse consumed recovery token;
- use token against another account;
- change recovery purpose/action;
- use expired token;
- brute-force low-entropy paths;
- stolen ordinary session attempts recovery-method change;
- compromised email/SMS provider simulation;
- malicious support/operator scenario;
- recovery immediately followed by privileged pairing;
- race between recovery completion and session/device revocation;
- network interruption/retry/idempotency;
- notification failure;
- backup/restore and key-rotation behavior.

## Core Rule

Recovery must restore legitimate access **without becoming a weaker universal bypass around passkeys, device trust, revocation or step-up authentication**.
