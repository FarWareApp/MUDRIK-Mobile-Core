# MUDRIK Identity, Authentication and Device Trust

## Purpose

Section 03 defines how MUDRIK proves **who** is acting, **which device** is acting, **how recently/strongly** the user authenticated, and **whether the device/session remains trusted**.

The design assumes hostile networks, stolen session material, malicious paired devices, compromised browsers, replay attempts and account-recovery abuse. No device becomes trusted merely because it is on the same Wi-Fi, has a familiar name, has a known IP address, or previously connected successfully.

This architecture is independent from AI/model identity. A model can never create a session, manufacture a trusted-device state, approve its own step-up authentication, or widen account authority.

## Standards Baseline

Section 03 follows the direction of:

- NIST SP 800-63-4 (final, July 2025) for current digital-identity, authentication and authenticator lifecycle guidance;
- W3C Web Authentication Level 3 for scoped public-key credentials and phishing-resistant WebAuthn flows;
- platform passkey APIs such as Android Credential Manager and Apple Authentication Services where supported;
- platform hardware-backed key facilities such as Android Keystore/StrongBox, Apple Keychain/Secure Enclave and desktop TPM-backed stores where available.

MUDRIK does not invent a proprietary password/passkey cryptographic protocol.

## Security Goals

1. Prefer phishing-resistant authentication.
2. Keep account identity separate from device identity.
3. Bind sensitive sessions to a registered device when practical.
4. Use short-lived access authority and rotation-capable long-lived session material.
5. Detect reuse/replay rather than silently accepting it.
6. Require fresh step-up authentication for high-risk account/security actions.
7. Allow users to inspect and revoke sessions/devices.
8. Make device revocation effective even if the revoked device is offline.
9. Treat account recovery as a high-risk security workflow, not as a weaker bypass.
10. Preserve enough audit metadata to investigate abuse without logging credentials or private authenticator material.

## Identity Domains

MUDRIK separates these identifiers:

- **Account ID** — stable internal account identifier. It is not an email address or display name.
- **User profile identity** — mutable user-facing name/preferences.
- **Authenticator credential ID** — passkey/WebAuthn or other approved authenticator identifier.
- **Device ID** — stable server-registered device record.
- **Device key ID** — identifier for the current cryptographic device key.
- **Session ID** — one authenticated login/session instance.
- **Refresh family ID** — rotation family used for reuse detection and revocation.

A mutable field such as email, phone number, device label, IP address or user-agent string must not become the primary trust anchor.

## Authentication Strategy

### Passkey first

Where supported, MUDRIK should prefer passkeys/WebAuthn public-key credentials.

Server-side rules:

- store public credential material only;
- verify relying-party/origin binding as required by the platform/protocol;
- verify challenge freshness;
- reject challenge reuse;
- validate user verification policy appropriate to the requested assurance;
- never treat a client-supplied `authenticated=true` flag as proof.

Passwords may exist only as a compatibility/fallback path if product requirements later demand them. A password fallback must not silently weaken privileged actions that require phishing-resistant step-up.

### Authentication assurance

MUDRIK models authentication assurance explicitly rather than as a boolean.

Conceptual levels:

- `none` — no authenticated account proof;
- `session` — valid existing authenticated session;
- `verified` — recent approved user-verification event;
- `phishing_resistant` — recent passkey/WebAuthn or equivalent phishing-resistant proof.

Risky actions can require a stronger level than the session currently carries.

Examples requiring fresh or strong step-up include:

- changing account recovery methods;
- enrolling or deleting authenticators;
- pairing a new high-privilege device;
- revoking every other trusted device;
- exporting highly sensitive data;
- changing security policy;
- approving critical capabilities;
- changing emergency/security contacts where abuse would be serious.

## Session Architecture

### Access authority

Access authority should be short lived. Production duration will be selected from the deployment threat model rather than being baked into the UI.

Each server-verifiable session context should bind at minimum:

- account ID;
- session ID;
- authenticated device ID when device binding is required;
- issued-at time;
- expiration time;
- authentication assurance level;
- last strong-authentication time;
- refresh family ID where refresh exists;
- revocation state/version.

### Refresh rotation

If refresh credentials are used:

- rotate on successful use;
- keep a server-side rotation family/reuse state;
- a superseded credential presented again is treated as suspected reuse;
- suspected reuse can revoke the affected refresh family and require reauthentication;
- refresh credentials are never exposed to AI/model prompts or ordinary application logs.

### Session inventory

The user-visible security surface should eventually show:

- device label;
- device/platform type;
- approximate first/last activity times;
- session creation time;
- current/this-device marker;
- security-relevant status (active/revoked/needs reauthentication);
- remote sign-out/revoke action.

Do not expose raw tokens, public keys, exact network telemetry or unnecessary fingerprinting data in this UI.

## Device Identity

Every trusted device gets an independent cryptographic identity.

Preferred lifecycle:

1. generate key pair locally;
2. private key remains local and non-exportable where platform support permits;
3. register public key/key identifier with the account;
4. server assigns a stable device record;
5. device proves possession for sensitive device-bound operations;
6. rotate keys without changing the logical device record when appropriate;
7. revoke the device independently from other devices.

The same device private key must never be copied to another device as a convenience mechanism.

### Hardware backing

Hardware-backed storage/attestation can strengthen trust but is not treated as perfect proof of safety. Attestation/integrity signals are risk inputs and policy inputs, not a magical bypass of normal authentication or authorization.

## Device Key Provider Contract

Platform adapters must expose operations such as:

- create a device signing key;
- return public key / key identifier / supported security metadata;
- sign a challenge or command proof;
- report whether the implementation believes the key is hardware-backed;
- rotate/delete the local key.

The contract intentionally does **not** expose `exportPrivateKey()`.

Production adapters will be platform-specific and are deferred to the real-environment/device phase.

## Pairing

Pairing creates trust and therefore requires explicit authorization.

A pairing flow must bind:

- account;
- authorizing session/device;
- target device;
- target public key/key ID;
- one-time challenge/pairing ID;
- issuance time;
- expiration time;
- requested device role/capability tier where applicable;
- explicit user confirmation for privileged pairing.

Security rules:

- pairing challenge is short lived;
- challenge is one-time use;
- source and target device IDs cannot silently collapse into one identity;
- a QR code, deep link or numeric code is transport for a challenge, not proof of trust by itself;
- pairing from an ordinary authenticated session may require fresh phishing-resistant step-up depending on requested privilege;
- network proximity is not proof of identity;
- already-revoked devices cannot authorize new pairing.

## Unpairing and Revocation

Revocation is a security boundary, not only a UI preference.

Revoking a device should invalidate or prevent:

- active sessions bound to that device where policy requires;
- refresh families issued to that device;
- future device-key proofs from the revoked key;
- future Control Plane task acceptance under that device identity;
- future pairing authority from that device.

Revocation must not require cooperation from the revoked device.

A local device that loses connectivity should fail toward reduced authority when its revocation freshness cannot be verified for an operation that requires online verification.

## Remote Sign-Out

Remote sign-out revokes the selected session/refresh family without implicitly deleting unrelated user data.

Security-critical account actions may offer broader options:

- revoke this session;
- revoke this device;
- revoke all other sessions;
- revoke all devices and require full reauthentication.

The most destructive choices require strong recent authentication.

## Step-Up Policy

Step-up decisions are deterministic and risk based.

Baseline mapping for pre-device implementation:

- `low` capability risk: an active session may be sufficient;
- `medium`: active session plus trusted/non-revoked device where the operation is device-bound;
- `high`: recent verified authentication; phishing-resistant authentication preferred/required when supported by the target flow;
- `critical`: fresh phishing-resistant authentication plus an explicit approval boundary. Critical actions cannot be silently approved by a refresh token, background process, AI model or companion state.

Later product-specific policy may be stricter. It must never be weaker without an explicit security review.

## Recovery

Account recovery is treated as a separate high-risk security domain.

Threats include:

- mailbox/SIM takeover;
- malicious support/social engineering;
- attacker adding a new recovery method after stealing a session;
- recovery token theft/replay;
- recovery being used to bypass passkey/device protections;
- helpdesk/operator overreach.

Baseline requirements:

- recovery tokens/challenges are one-time and short lived;
- recovery does not reveal whether unnecessary account attributes exist;
- changing recovery methods requires strong reauthentication when the user still has access;
- suspicious recovery can revoke sessions or require new device enrollment;
- no support operator receives universal ability to read secrets or impersonate the account;
- security-relevant recovery events are auditable and user-visible where safe;
- high-risk recovery may use delay/notification/secondary verification as compensating controls depending on deployment model.

Recovery implementation is not enabled in pre-device Section 03; only the threat model and contracts are defined.

## Replay and Challenge Rules

Authentication/device proof challenges must include or bind to:

- unique challenge ID/nonce;
- account/session/device context as applicable;
- purpose/action;
- issued-at and expiration;
- relying service/audience where applicable.

A challenge for one purpose must not authorize a different purpose.

The verifier rejects:

- expired challenge;
- used challenge;
- wrong account/session/device;
- wrong purpose/audience;
- invalid cryptographic proof;
- stale/revoked device key.

Transport TLS is necessary but does not replace these checks.

## Trust-State Model

Device/session states should be explicit.

Device examples:

- `pending_pairing`;
- `active`;
- `rotation_required`;
- `suspended`;
- `revoked`.

Session examples:

- `active`;
- `reauth_required`;
- `suspected_reuse`;
- `revoked`;
- `expired`.

Unknown or malformed state is not interpreted as active.

## Privacy

Identity/security telemetry must minimize fingerprinting.

Do not log:

- access/refresh tokens;
- passkey private material;
- device private keys;
- raw biometric data;
- recovery secrets;
- complete WebAuthn assertions unless a narrowly scoped forensic design explicitly requires protected retention.

Use stable internal IDs and coarse security metadata where sufficient.

## Pre-Device Implementation Boundary

Section 03 may implement and automatically test:

- identity/session/device schema validation;
- authentication assurance policy;
- session expiration/revocation/reuse policy;
- pairing challenge policy;
- device trust and revocation rules;
- key-provider interfaces that make private-key export impossible by contract;
- recovery threat model;
- adversarial malformed-input/replay/cross-account tests.

Section 03 does **not** yet enable:

- live passkey registration/login;
- production tokens;
- actual Android/iOS hardware-backed key storage;
- server refresh-token rotation database;
- production recovery;
- real Control Plane device registration.

Those require platform/backend integration and Layer 4 real-environment evidence.

## Mandatory Layer 4 Evidence Later

Before final Section 03 closure:

- real passkey registration/sign-in on supported target platforms;
- credential loss/cancel/error flows;
- hardware-backed/non-exportable device key behavior where supported;
- pairing between real devices;
- remote revoke/sign-out while the target device is online and offline;
- refresh rotation/reuse detection against production-like backend state;
- app reinstall/device migration behavior;
- recovery abuse tests;
- platform biometric/user-verification behavior;
- clock skew/network interruption/reconnect behavior;
- independent security review/penetration-test plan for auth/device boundaries.

## Non-Negotiable Rules

1. No network location creates trust.
2. No AI/model output creates authentication or device trust.
3. No private device key is exportable through the MUDRIK key-provider contract.
4. Unknown/malformed identity state fails closed.
5. Device revocation works without cooperation from the revoked device.
6. Critical account/security actions require fresh strong authentication.
7. Recovery is never a silent weaker bypass around normal authentication.
8. Tokens and private authenticator material never enter normal logs or AI prompts.
9. Pairing codes/QR/deep links are not trust proofs by themselves.
10. Final trust claims require real platform/backend verification, not mocks alone.
