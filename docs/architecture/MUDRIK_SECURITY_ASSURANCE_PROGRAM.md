# MUDRIK Security Assurance Program

## Purpose

MUDRIK must be engineered so that security is continuously demonstrated, not merely claimed.

No software can be guaranteed to be impossible to compromise. The required product posture is therefore high assurance: prevent as much as practical, minimize attack surface, continuously verify, detect suspicious behavior quickly, contain compromise, preserve user control, recover safely, and retain enough evidence to understand what happened without collecting unnecessary private content.

This program applies to the mobile app, web surface, Control Plane, Computer Agent, smart-home adapters, voice stack, companion presence, health/emergency features, memory, data stores, model providers, build pipeline, release system and support tooling.

## Security Objectives

1. A compromise of one component must not automatically compromise another.
2. No AI model is an authority boundary.
3. High-risk actions require independent policy authorization.
4. Device identity and user identity are independently authenticated.
5. Sensitive sensors and private data are unavailable by default.
6. Security state is observable and auditable without logging private payloads by default.
7. Security-relevant failures fail closed whenever safety permits.
8. Every credential, pairing and grant must be revocable.
9. Every release must be attributable to a verified build and source revision.
10. The company must be able to detect, investigate, contain, notify and recover from incidents under documented procedures.

## Standards Baseline

MUDRIK security work should be mapped to current authoritative standards and guidance, including:

- NIST SP 800-207 Zero Trust Architecture;
- NIST SP 800-218 Secure Software Development Framework, while monitoring newer revisions;
- OWASP MASVS and MASTG for mobile security verification;
- OWASP ASVS for web/backend application controls where applicable;
- SLSA for software supply-chain provenance and build integrity;
- platform security guidance for Android, iOS, browsers and desktop operating systems;
- applicable EU cybersecurity, privacy and product-security obligations.

Standards are verification baselines, not substitutes for MUDRIK-specific threat modeling.

## Threat Modeling

Every security-sensitive feature must have a maintained threat model before production release.

Threat models should cover at minimum:

- assets;
- trust boundaries;
- attackers and attacker capabilities;
- entry points;
- data flows;
- identity transitions;
- privilege transitions;
- persistence mechanisms;
- abuse cases;
- replay and race conditions;
- compromised-device scenarios;
- malicious or compromised model-provider scenarios;
- insider and support-tool misuse;
- supply-chain compromise;
- stolen credentials;
- paired-device theft;
- malicious smart-home integrations;
- prompt/tool injection;
- local network hostility;
- browser/session compromise;
- rollback and update attacks;
- privacy leakage through logs, analytics, crash reports or backups.

Threat models must be revised when architecture, permissions, providers or supported device classes materially change.

## Compartmentalization

Security domains must use separate credentials, scopes, service identities and data-access policies.

Examples:

- the companion renderer cannot directly query raw health records;
- the AI provider cannot directly operate the Computer Agent;
- the Computer Agent cannot read health data merely because the user account owns both;
- the web session cannot directly access local sensors;
- a smart-home adapter cannot read conversations;
- analytics cannot receive raw camera/audio content;
- support personnel do not receive universal data access;
- an emergency integration receives only the minimum emergency packet authorized for that event.

Cross-domain requests must be mediated by explicit policy-enforced APIs.

## Device Trust and Cryptographic Identity

Each trusted device should have a device-bound asymmetric identity.

Preferred protections where platform support exists:

- hardware-backed key generation;
- Android Keystore / StrongBox where available;
- Apple Keychain / Secure Enclave where available;
- TPM-backed keys on supported computers;
- non-exportable private keys;
- short-lived certificates or tokens;
- key rotation;
- remote revocation;
- attestation where it materially improves security and does not create unacceptable privacy coupling.

Device private keys must never be transmitted to MUDRIK servers or model providers.

## Command Authenticity

Sensitive commands crossing device or service boundaries must use authenticated envelopes containing, where appropriate:

- user identity;
- device identity;
- task ID;
- issued-at time;
- expiry;
- nonce;
- sequence number;
- requested capability;
- target resource;
- risk level;
- approval reference;
- protocol version;
- signature.

Receivers must reject expired, duplicated, replayed, malformed, wrong-device and wrong-scope commands.

## Least Privilege and Capability Isolation

Capabilities must be granular, separately revocable and scoped to resources.

A grant should constrain as many dimensions as possible, including:

- capability type;
- device;
- repository or filesystem root;
- executable family;
- network domains;
- duration;
- number of uses;
- background execution;
- elevation;
- data class;
- destination;
- user presence requirement.

Persistent broad grants should be exceptional.

## Sensitive Sensors

Camera, microphone, location, health telemetry, room presence, UWB, Bluetooth proximity and spatial sensors require explicit runtime state tracking.

Security requirements include:

- visible status where platforms permit;
- immediate stop controls;
- truthful sensor-state reporting;
- no silent reactivation after a privacy lock;
- local processing where practical;
- minimized retention;
- explicit cloud-transfer policy;
- per-feature access rather than global sensor ownership;
- logs record state transitions, not raw sensor content by default.

## Encryption and Data Protection

Data must be classified before storage or transfer.

Baseline expectations:

- modern authenticated encryption in transit and at rest;
- managed key hierarchy rather than application-embedded master keys;
- separation between encryption keys and encrypted data stores;
- key rotation support;
- no secrets in source control, builds, logs or analytics;
- sensitive local databases protected using platform security facilities where practical;
- highly sensitive categories such as health, credentials, private sensor-derived data and recovery secrets receive stronger isolation;
- deletion and retention policies must be technically enforceable.

Encryption is not sufficient by itself: authorization and data minimization remain mandatory.

## Authentication

Preferred user authentication posture:

- passkeys where available;
- MFA or step-up authentication for high-risk changes;
- short-lived access sessions;
- rotating refresh credentials;
- refresh-token reuse detection where supported;
- session inventory;
- remote logout;
- recent-authentication requirement for sensitive security changes;
- hardened account recovery;
- protection against credential stuffing and automated abuse.

Account recovery must be treated as a privileged security workflow rather than a convenience feature.

## AI and Tool Security

Model outputs are untrusted input.

An AI model may propose actions but must never directly grant itself permissions.

Required controls include:

- structured tool schemas;
- allowlisted tools;
- argument validation;
- policy evaluation after model output;
- per-step authorization for privileged agent work;
- output and resource limits;
- prompt-injection resistance through data/tool separation;
- no model access to plaintext secrets unless a narrowly scoped secret-use capability explicitly requires it;
- secret reference injection rather than raw-secret disclosure where possible;
- no automatic privilege escalation because a model claims it is necessary.

## Computer Agent Hardening

The Computer Agent is a high-value target and must be treated as a privileged security boundary.

Production requirements should include:

- outbound-only control connection by default;
- no unauthenticated remote-shell port;
- device-bound identity;
- signed and replay-protected task envelopes;
- sandbox or constrained execution where technically feasible;
- workspace boundaries;
- executable allow/deny policy;
- bounded environment variables;
- secrets isolation;
- resource quotas;
- timeout and cancellation;
- process-tree termination;
- elevation isolation;
- explicit destructive-operation handling;
- signed agent updates;
- rollback protection;
- local emergency pause/disconnect;
- tamper-aware security state where feasible.

## Web and Control Plane Hardening

The web/control-plane attack surface requires independent controls for:

- CSRF;
- XSS;
- SSRF;
- injection;
- broken access control;
- insecure direct object references;
- session theft;
- API abuse;
- websocket/session hijacking;
- tenant isolation;
- rate limiting;
- request size limits;
- deserialization and schema validation;
- outbound allowlisting for sensitive integrations.

Authorization decisions must be server-side and resource-specific.

## Mobile Hardening

The mobile release process should verify relevant OWASP MASVS controls, including storage, cryptography, authentication, network, platform interaction, code quality, resilience and privacy.

Production builds should consider, where appropriate:

- secure local storage;
- certificate and network hardening;
- exported-component review;
- intent/deep-link validation;
- backup policy;
- screenshot/privacy behavior for sensitive screens;
- root/jailbreak risk signals used carefully rather than treated as perfect proof;
- anti-tamper and reverse-engineering friction for high-value client logic;
- integrity checks where useful;
- dependency scanning;
- no debug endpoints or debug secrets in production.

## Supply-Chain Security

A secure application cannot rely on an insecure build system.

Required program elements should include:

- dependency lockfiles;
- dependency update policy;
- vulnerability scanning;
- license inventory;
- SBOM generation for production releases;
- reproducible or hermetic build practices where feasible;
- isolated CI identities;
- protected release credentials;
- signed artifacts;
- provenance/attestation;
- review of third-party SDK data collection;
- restricted use of install scripts and untrusted build plugins;
- rapid revocation path for compromised dependencies.

## Release Security Gate

A production release should not ship merely because application tests pass.

Security release criteria should include:

- clean secret scan;
- dependency and vulnerability scan;
- static analysis;
- mobile security checks;
- infrastructure policy checks;
- relevant threat-model review;
- permission diff review;
- signing/provenance validation;
- critical/high vulnerability disposition;
- rollback and revocation readiness;
- incident contacts and runbooks current.

High-risk releases should receive additional manual security review.

## Continuous Detection

MUDRIK should detect security anomalies without building a surveillance system around the user.

Prefer metadata such as:

- authentication anomalies;
- repeated failed authorization;
- impossible command sequences;
- replay attempts;
- invalid signatures;
- sudden device-identity changes;
- unexpected capability use;
- privilege escalation attempts;
- abnormal data-export volume;
- suspicious token reuse;
- integrity failures;
- unexpected agent update state;
- policy-engine bypass attempts.

Do not log raw private conversations, raw camera streams, microphone recordings or plaintext secrets merely for security convenience.

## Security Kill Switches

MUDRIK must support rapid containment at multiple scopes:

- revoke one user session;
- revoke one paired device;
- revoke one Computer Agent identity;
- disable one integration;
- disable one capability;
- disable one vulnerable app version;
- rotate one key class;
- block one provider;
- stop remote computer tasks;
- disable sensitive sensor use;
- pause a rollout globally.

Containment controls must not depend on the compromised component continuing to cooperate.

## Incident Response

Maintain tested runbooks for at least:

- account takeover;
- stolen device;
- token/credential leak;
- backend compromise;
- Computer Agent compromise;
- malicious package/dependency;
- signing-key compromise;
- unauthorized sensor access;
- personal-data breach;
- health-data exposure;
- smart-home unauthorized action;
- compromised update;
- model/tool injection incident;
- outage affecting security controls.

Each runbook should identify containment, evidence preservation, user protection, credential rotation, rollback, regulatory assessment, communication and post-incident remediation.

## Regulatory Incident Readiness

MUDRIK should maintain a legal/compliance incident matrix for every market in which it operates.

For the EU, cybersecurity and personal-data reporting clocks must be treated as engineering requirements, not paperwork afterthoughts.

The incident system should automatically record the reliable timestamp at which MUDRIK became aware of a potentially reportable event, preserve decision evidence, assign an incident owner, and track external notification deadlines without exposing unnecessary private data.

As of September 2026, EU Cyber Resilience Act reporting obligations for qualifying products with digital elements have begun applying. Separate GDPR breach-notification duties may also apply to incidents involving personal data.

Legal counsel must determine scope and reportability for actual incidents, but the technical system must make timely compliance possible.

## Security Testing Program

Security validation must include more than ordinary unit tests.

Program elements should include:

- SAST;
- dependency scanning;
- secret scanning;
- IaC/configuration scanning;
- fuzzing of parsers and protocol boundaries;
- API authorization tests;
- replay tests;
- malformed-envelope tests;
- privilege-boundary tests;
- workspace escape tests;
- prompt/tool injection evaluations;
- mobile MASVS/MASTG testing;
- web penetration testing;
- Computer Agent penetration testing;
- cryptographic implementation review;
- external penetration testing before high-risk production launches;
- periodic retesting after major architecture changes.

Security tests should be automated where possible and independently reviewed where consequences are high.

## Adversarial Program

Before broad release of sensitive capabilities, MUDRIK should conduct adversarial exercises against its own system.

Examples:

- attempt to make a compromised web session control a computer outside granted scope;
- attempt to reactivate a camera after privacy lock;
- attempt to reuse an old signed command;
- attempt to exfiltrate secrets through model output;
- attempt to trick one user's device into accepting another user's task;
- attempt to modify a release artifact after signing;
- attempt to use smart-home context to access unrelated private data;
- attempt to escalate from read-only to destructive permissions;
- attempt to hide a security event from monitoring.

A failed security boundary should block release until remediation or formally accepted risk.

## External Security Review

For a product with this level of device, sensor and computer authority, internal testing alone is insufficient.

Before high-risk public launch, require independent penetration testing by qualified external specialists. Repeat assessments periodically and after major changes to authentication, cryptography, Computer Agent, sensor control, emergency/health systems, update mechanisms or control-plane architecture.

A coordinated vulnerability disclosure process and later a scoped bug-bounty program should be established when operational readiness is sufficient to triage and remediate reports safely.

## Security Metrics

Do not use a fictional percentage such as "99.99% secure" as a trust claim.

Track measurable assurance indicators instead, such as:

- number and age of unresolved critical/high vulnerabilities;
- time to revoke compromised credentials;
- time to detect suspicious authorization behavior;
- time to ship critical fixes;
- security test coverage of privilege boundaries;
- percentage of production artifacts with verified provenance;
- percentage of sensitive capabilities with maintained threat models;
- penetration-test remediation closure;
- percentage of releases passing all required security gates;
- incident recovery exercise results.

Security confidence comes from evidence, not a marketing percentage.

## User Trust

The application must make security and privacy state understandable to the user.

The user should be able to see and control:

- signed-in sessions;
- paired devices;
- active sensors;
- granted capabilities;
- Computer Agent status;
- smart-home integrations;
- active background tasks;
- recent sensitive actions;
- security alerts;
- revocation controls;
- privacy lock.

MUDRIK must never conceal observation, security incidents or known material compromise from the affected user merely to protect brand reputation.

## Company Protection

Strong technical controls reduce risk, but company protection also requires evidence of responsible engineering.

MUDRIK should preserve auditable evidence that security controls were designed, tested, reviewed, updated and operated responsibly. Documentation should include threat models, security decisions, release attestations, vulnerability remediation, external assessment reports, incident exercises and regulatory decision records.

This documentation must avoid unnecessary retention of user-private content.

## Core Rule

MUDRIK security must be hostile to unauthorized control while remaining transparent and controllable to the legitimate user.

No component is trusted merely because it is "inside" MUDRIK. Every sensitive access is authenticated, scoped, authorized, observable, revocable and recoverable.