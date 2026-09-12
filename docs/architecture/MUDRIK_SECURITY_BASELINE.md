# MUDRIK Security Baseline

## Goal

MUDRIK must be designed under the assumption that every component can eventually fail, be misconfigured, be compromised or receive malicious input.

There is no such thing as an absolutely unbreakable system. The target is therefore:

- make compromise difficult;
- detect it early;
- contain it to the smallest possible blast radius;
- fail securely;
- preserve user privacy;
- prevent one compromised component from automatically controlling the rest of MUDRIK;
- make recovery, revocation and key rotation possible without rebuilding the product.

Security is a platform property, not a single feature.

## Core Security Principles

MUDRIK adopts:

- Zero Trust;
- least privilege;
- deny by default;
- explicit capability grants;
- defense in depth;
- fail secure / fail closed for sensitive operations;
- compartmentalization;
- local-first handling for highly sensitive data where practical;
- short-lived credentials;
- device-bound identity;
- cryptographically authenticated commands;
- auditable security state transitions;
- secure update and build provenance;
- continuous verification rather than one-time trust.

A companion profile, AI model, web session or device pairing never implies unrestricted authority.

## Security Domains

The platform should be split into separately protected domains:

1. User authentication and account identity.
2. Device identity and pairing.
3. Mobile application runtime.
4. Web session and browser surface.
5. Control Plane.
6. Computer Agent.
7. Smart-home/device adapters.
8. Voice/STT/TTS services.
9. Memory and user data.
10. Health / Emergency Guardian data.
11. Observation/privacy sensor control.
12. Secrets and credentials.
13. Model/AI providers.
14. Build, release and update pipeline.
15. Security telemetry and audit records.

Compromise in one domain must not automatically grant authority in another.

## Identity and Authentication

Recommended baseline:

- passkeys where platform support allows;
- strong password fallback only where required;
- MFA / step-up verification for sensitive account changes;
- short-lived access tokens;
- rotation-capable refresh tokens;
- refresh-token reuse detection where supported;
- session revocation;
- device-level session list;
- remote sign-out;
- high-risk actions require recent authentication;
- recovery flows must be treated as high-risk attack surfaces.

No long-lived plaintext account secret should be stored in application source, browser storage or logs.

## Device Identity

Every trusted device should receive its own cryptographic identity.

Preferred design:

- generate a device key pair locally;
- keep the private key local;
- use hardware-backed secure storage where the platform provides it;
- derive a stable device identity from the public key or registered credential;
- bind pairing to account + device;
- support device revocation;
- support key rotation;
- never reuse one device private key across unrelated devices.

The server should trust signed proofs from registered device keys rather than only device names or mutable IDs.

## Command Authenticity and Replay Protection

Sensitive remote commands must be authenticated independently of transport encryption.

Task/command envelopes should carry, as applicable:

- command/task ID;
- issuing account/user ID;
- source device ID;
- destination device ID;
- issued-at timestamp;
- expiration time;
- nonce;
- sequence number;
- requested capability set;
- scope;
- approval record;
- cryptographic signature.

The receiver must reject:

- expired messages;
- invalid signatures;
- reused nonces;
- repeated sequence numbers outside allowed recovery windows;
- mismatched destination device IDs;
- undeclared capabilities;
- commands crossing approved scope.

## Authorization and Capability Security

Permissions must be capability-based and independently scoped.

Examples:

- `camera.observe`
- `microphone.listen`
- `location.read`
- `health.read.heart_rate`
- `emergency.call.initiate`
- `filesystem.read`
- `filesystem.write`
- `terminal.execute`
- `git.write`
- `home.light.control`
- `media.playback.control`

A capability grant may also restrict:

- device;
- room;
- repository;
- filesystem root;
- command family;
- external domain;
- duration;
- background execution;
- elevation;
- time window;
- maximum operation count.

A model cannot create or expand its own grants.

## AI and Model Isolation

AI models are treated as untrusted planners, not security authorities.

Models may:

- interpret user intent;
- propose actions;
- generate plans;
- select tools from an allowed set;
- explain results.

Models may not independently:

- bypass permission checks;
- read arbitrary secrets;
- elevate privileges;
- turn sensors back on after a privacy lock;
- issue raw unrestricted operating-system commands unless an already-authorized tool scope permits them;
- modify their own security policy;
- disable security logs;
- approve their own critical actions.

All real-world effects pass through deterministic policy enforcement outside the model.

## Computer Agent Hardening

The Computer Agent should be treated as a highly sensitive component.

Baseline requirements:

- no unauthenticated remote shell;
- no public raw localhost control endpoint exposed for remote use;
- outbound authenticated control channel;
- signed task envelopes;
- default-deny policy engine;
- per-step re-authorization;
- workspace/root path confinement;
- direct process spawning instead of shell interpolation by default;
- minimal inherited environment;
- secret references rather than plaintext expansion where possible;
- process timeout;
- output limits;
- cancellation;
- emergency local pause/disconnect;
- audit events;
- explicit privilege elevation;
- destructive actions require stronger approval;
- critical actions require fresh one-shot approval.

Long-term, sensitive tools should execute in sandboxes or constrained subprocesses where technically practical.

## Mobile Application Security

The mobile application should be verified against current OWASP MASVS/MASTG guidance.

Controls should cover at minimum:

- secure storage;
- authentication;
- cryptography;
- network communication;
- platform interaction;
- code quality;
- resilience;
- privacy.

Additional expectations:

- never place production secrets in the application bundle;
- use platform secure storage for tokens/keys;
- minimize sensitive data at rest;
- database encryption where threat model requires it;
- clear sensitive temporary data when no longer needed;
- safe deep-link validation;
- secure WebView usage if ever introduced;
- avoid trusting rooted/jailbroken-device detection as a primary security boundary;
- treat runtime integrity signals as risk inputs, not absolute proof.

## Web Security

The web surface should assume hostile browser input and malicious scripts.

Baseline controls:

- secure cookies where applicable;
- HttpOnly and SameSite protections;
- CSRF protection where relevant;
- strong CSP;
- strict origin validation;
- XSS prevention through safe rendering;
- output encoding;
- no long-lived privileged secrets in localStorage;
- session rotation;
- re-authentication for high-risk account changes;
- rate limits;
- anti-automation protections on abuse-prone endpoints;
- safe file upload validation;
- explicit device/session binding where useful.

The browser never receives an unrestricted computer credential.

## Transport Security

Production communication should use modern authenticated encryption in transit.

Requirements include:

- HTTPS/WSS only in production;
- modern TLS configuration;
- no plaintext fallback;
- certificate validation;
- key/certificate rotation support;
- message authentication for sensitive commands even inside TLS;
- replay protection;
- request size and rate limits;
- secure reconnect logic;
- no trust based solely on source IP.

Certificate pinning should only be used if an operationally safe rotation/recovery strategy exists; poor pinning design can create outages without materially improving the overall architecture.

## Secrets Management

Secrets must be separated from source code and user-visible logs.

Rules:

- no API keys, private keys or production passwords committed to Git;
- use secret managers or protected runtime configuration;
- environment variables alone are not a complete security model;
- prefer short-lived credentials where providers support them;
- rotate leaked credentials immediately;
- redact secrets from diagnostics;
- do not send unnecessary secrets to AI providers;
- Computer Agent tools receive secret references instead of permanent plaintext whenever possible;
- privileged secrets should be scoped per environment and service.

## Data Compartmentalization

Sensitive data classes should be independently protected.

Examples:

- normal conversations;
- long-term memory;
- health data;
- camera/vision data;
- voice recordings;
- location/presence;
- device inventory;
- computer-agent workspace metadata;
- credentials/secrets;
- emergency contacts.

Access to one class does not imply access to another.

Health and emergency data require stricter controls than ordinary companion preferences.

## Privacy as a Security Boundary

The Observation Privacy State Machine is authoritative.

Examples:

- `visual_off` prevents MUDRIK visual processing;
- `privacy_lock` prevents passive ambient observation from silently resuming;
- device handoff must not re-enable disabled observation;
- AI models cannot override user privacy state;
- application restart cannot silently undo privacy lock;
- sensor activation must be visible where platform support allows it.

If runtime state cannot be verified, the system should fail toward the more private interpretation.

## Smart Home and IoT Security

Each smart-home integration should be isolated through an adapter.

Requirements:

- per-device or per-home authorization;
- avoid sharing one master credential across integrations;
- minimal cloud permissions;
- local control where available and appropriate;
- action allowlists;
- risk classification;
- rate limits;
- state verification after commands when supported;
- safe handling of offline/unreachable devices;
- destructive/security-sensitive home actions require stronger approval.

## Emergency Guardian Security

Emergency capabilities need a dedicated security domain.

Requirements:

- health permissions are separate from ordinary companion permissions;
- emergency call capability is separate from health-read capability;
- simulation/test mode cannot place a real emergency call;
- emergency contacts and location sharing are scope-limited;
- no broad conversation history is transmitted as part of an emergency packet;
- emergency override policies, if offered, must be explicitly configured in advance;
- audit all emergency escalation actions;
- no model may silently rewrite emergency policy.

## Secure Updates

Every distributable MUDRIK component should support authenticated updates.

Target requirements:

- signed releases;
- verification before install;
- rollback protection where practical;
- secure staged rollout;
- emergency revoke/disable mechanism for compromised releases;
- reproducible or provenance-backed builds where feasible;
- versioned protocols to prevent silent incompatibility;
- release metadata integrity.

The Computer Agent is particularly sensitive and should never execute an unsigned update package.

## Software Supply Chain

MUDRIK should adopt a supply-chain security program aligned with SLSA concepts and secure development practices.

Controls should include:

- dependency lockfiles;
- automated dependency vulnerability scanning;
- secret scanning;
- code review for critical changes;
- CI isolation;
- protected release credentials;
- build provenance/attestation;
- signed release artifacts;
- minimal third-party dependencies;
- SBOM generation for production releases where practical;
- dependency update policy;
- rapid response path for critical CVEs.

## Secure Development Lifecycle

Development should align with NIST SSDF principles.

Each major phase should include:

1. Threat modeling.
2. Security requirements.
3. Secure design review.
4. Implementation.
5. Static checks.
6. Dependency checks.
7. Unit/integration tests.
8. Security-specific negative tests.
9. Secret scan.
10. Release validation.
11. Post-release monitoring.
12. Incident-response readiness.

Security acceptance criteria are part of the completion gate, not optional post-release work.

## Threat Modeling

Maintain an explicit threat model covering at least:

- stolen phone;
- stolen account credentials;
- malicious paired device;
- compromised browser session;
- compromised Computer Agent;
- prompt/tool injection;
- malicious file content;
- dependency compromise;
- CI compromise;
- server breach;
- database breach;
- replay attacks;
- man-in-the-middle attempts;
- malicious smart-home integration;
- model/provider data leakage;
- unauthorized camera/microphone use;
- privilege escalation;
- malicious update;
- insider access;
- denial of service.

Every high-value feature should document assets, trust boundaries, likely attackers, abuse paths and mitigations.

## Security Testing

MUDRIK should eventually have automated and manual security testing including:

- SAST;
- dependency scanning;
- secret scanning;
- configuration scanning;
- fuzzing for parsers/protocols where useful;
- API authorization tests;
- replay tests;
- cross-account isolation tests;
- cross-device isolation tests;
- permission-bypass tests;
- path traversal tests;
- injection tests;
- malformed task-envelope tests;
- privacy-state bypass tests;
- compromised-device simulations;
- update-signature failure tests;
- security-focused penetration testing before major production release;
- periodic red-team exercises for Agent/tool boundaries.

## Audit and Security Telemetry

Security logging should record important state transitions without becoming a privacy leak.

Examples:

- sign-in/sign-out;
- device pairing/revocation;
- permission grant/revoke;
- critical command approval;
- privacy-state changes;
- emergency escalation;
- key rotation;
- update verification failure;
- repeated authorization failures;
- suspected replay;
- anomalous agent behavior.

Logs must redact secrets and minimize sensitive content.

The user should have access to understandable security history for their own account where appropriate.

## Incident Response

MUDRIK needs an explicit incident-response capability before large-scale deployment.

It should support:

- revoke a device;
- revoke a session;
- rotate keys;
- disable a compromised integration;
- remotely disable a vulnerable capability;
- block a compromised app/agent version;
- force security update when necessary;
- preserve forensic metadata without collecting unnecessary user content;
- notify affected users when required;
- restore service from known-good configurations.

## Availability and Abuse Resistance

Security also includes continued safe operation.

Controls should include:

- per-user and per-device rate limits;
- task quotas;
- bounded background work;
- queue isolation;
- circuit breakers;
- retry limits;
- resource caps;
- protection against recursive agent loops;
- protection against runaway tool execution;
- protection against event floods;
- safe degraded mode during partial outages.

## User Security Controls

The user should be able to see and control:

- signed-in sessions;
- paired devices;
- active sensors;
- important permissions;
- companion observation state;
- trusted integrations;
- emergency policy;
- recent high-risk actions;
- security alerts;
- remote revoke/sign-out controls.

Security state should be understandable without requiring expert knowledge.

## Security Standard Alignment

MUDRIK should track and periodically re-evaluate relevant standards and guidance, including:

- OWASP MASVS / MASTG for mobile security;
- OWASP web/application security guidance;
- NIST Secure Software Development Framework (SSDF);
- SLSA for software supply-chain integrity;
- platform security guidance from Apple, Google, Microsoft and supported operating systems;
- applicable privacy, AI, medical and cybersecurity regulation in deployment jurisdictions.

Standards are baselines, not substitutes for MUDRIK-specific threat modeling.

## Non-Negotiable Rules

1. No AI model is a security authority.
2. No component receives unrestricted authority by default.
3. User privacy commands override convenience features.
4. A compromised component must have a limited blast radius.
5. Secrets are never committed to source code.
6. Sensitive commands are authenticated and replay-protected.
7. Critical permissions require explicit, narrowly scoped authorization.
8. Security checks cannot be bypassed by companion personality or prompt text.
9. Production updates must be authenticated.
10. Security failures must fail toward the safer state whenever practical.
11. We never claim MUDRIK is impossible to hack.
12. Security posture must be continuously tested and improved.
