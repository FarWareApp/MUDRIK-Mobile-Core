# Security Policy

## Supported Security Posture

MUDRIK is under active development. Security issues affecting authentication, authorization, privacy, device control, Computer Agent authority, secrets, update integrity, health/emergency behavior, or cross-user/cross-device isolation are treated as high priority.

## Reporting a Vulnerability

Please do not publish an exploitable vulnerability, credential, private key, sensitive user data, or working attack chain in a public issue.

Use GitHub's private vulnerability reporting / security advisory mechanism for this repository when available. If a private reporting channel is temporarily unavailable, contact the project owner through a private channel rather than disclosing exploit details publicly.

A useful report should include, where safe:

- affected commit/version;
- affected component;
- impact;
- minimum reproduction steps;
- whether authentication or user interaction is required;
- whether cross-account/cross-device impact exists;
- sanitized logs or proof of concept;
- suggested mitigation if known.

Do not include real user secrets or unrelated private content in evidence.

## Coordinated Disclosure

The project intends to acknowledge, triage, remediate and verify valid reports before public disclosure of exploit details. Disclosure timing should account for user protection, patch availability and legal obligations.

Security reports must not be suppressed merely to protect brand reputation.

## Severity Priorities

Highest-priority classes include:

- authentication bypass;
- capability/authorization bypass;
- arbitrary remote code execution;
- Computer Agent sandbox/workspace escape;
- cross-account or cross-device data access;
- unauthorized camera/microphone/location/health access;
- privacy-lock bypass;
- plaintext secret exposure;
- signing/update bypass;
- replay of sensitive commands;
- emergency action misuse;
- destructive action without required approval.

## Development Security Rules

- Never commit production secrets or private keys.
- Treat model output as untrusted input.
- Sensitive actions require deterministic policy authorization.
- Unknown or unverifiable authority fails closed.
- Security telemetry must minimize and redact sensitive content.
- Security fixes should add regression coverage when technically feasible.
- Critical/High findings block affected release scope until remediated or formally dispositioned with compensating controls.

## Safe Testing

Security testing must avoid harm to third parties, real emergency-service calls, destructive actions against systems not owned or explicitly authorized, or collection of unnecessary personal data.

Use test accounts, simulation modes and isolated environments wherever possible.
