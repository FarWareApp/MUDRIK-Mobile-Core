# MUDRIK Threat Model Template

Use this template for every security-sensitive subsystem before production release.

## 1. System Identity

- subsystem / feature:
- owner:
- current section:
- repository / service:
- version / commit:
- review date:
- reviewers:

## 2. Intended Purpose

Describe exactly what the subsystem is allowed to do and what it must never do.

## 3. Assets

List assets requiring protection, for example:

- account identity;
- device private keys;
- refresh credentials;
- capability grants;
- health data;
- camera/microphone data;
- location/presence;
- user memory;
- computer workspace;
- source code;
- signing keys;
- release artifacts;
- security telemetry.

For each asset record confidentiality, integrity and availability impact.

## 4. Trust Boundaries

Identify every transition between separately trusted domains.

Examples:

- user -> UI;
- UI -> policy engine;
- model -> tool request;
- mobile -> Control Plane;
- Control Plane -> Computer Agent;
- service -> database;
- CI -> artifact store;
- runtime -> external provider.

A network location or shared account does not remove a trust boundary.

## 5. Identities and Authority

Record:

- human identities;
- device identities;
- service identities;
- session identities;
- capabilities involved;
- elevation transitions;
- approval requirements;
- revocation mechanisms.

No authority should exist without an explicit identity and scope.

## 6. Entry Points

List every externally or internally reachable input:

- APIs;
- websocket messages;
- deep links;
- files;
- notifications;
- model output;
- browser input;
- voice input;
- device events;
- update packages;
- admin/support tooling.

## 7. Data Flows

For each sensitive flow record:

- source;
- destination;
- data class;
- encryption/authentication;
- authorization decision point;
- retention;
- logging;
- failure mode.

## 8. Attacker Model

Evaluate at least where relevant:

- unauthenticated internet attacker;
- malicious authenticated user;
- stolen account/session;
- stolen or compromised paired device;
- malicious browser extension/script;
- hostile local network;
- compromised provider;
- compromised model output;
- malicious file/content;
- dependency/build compromise;
- insider/support misuse;
- compromised server/database;
- physical device thief.

## 9. Abuse Cases

Write concrete abuse stories, not vague categories.

Examples:

- reuse an expired signed task;
- trick Device B into accepting Device A's grant;
- escape an approved workspace path;
- reactivate a camera after privacy lock;
- exfiltrate a secret through telemetry;
- replace a signed artifact;
- escalate a read capability into write/admin authority;
- cause repeated delivery to execute a destructive task twice.

## 10. Security Controls

Map each abuse case to deterministic controls:

- authentication;
- capability authorization;
- replay protection;
- idempotency;
- sandboxing;
- secure storage;
- encryption;
- data minimization;
- rate limiting;
- kill/revoke controls;
- signed updates;
- audit events;
- recovery.

Do not list AI reasoning as a security control.

## 11. Failure and Degraded Modes

Define what happens when:

- identity cannot be verified;
- policy service is unavailable;
- network is unavailable;
- storage is corrupted;
- clock is wrong;
- signing verification fails;
- revocation state is stale;
- logging fails;
- an external provider is compromised/unavailable.

Sensitive operations should fail toward the safer state unless safety requirements demand a separately documented fallback.

## 12. Privacy Impact

Record:

- personal/sensitive data processed;
- whether raw content is necessary;
- local-vs-cloud processing;
- retention duration;
- deletion controls;
- user visibility/control;
- bystander/shared-device considerations;
- telemetry minimization.

## 13. Supply-Chain and Update Risk

Record:

- dependencies/plugins;
- build identities;
- artifact provenance;
- signing;
- rollback prevention;
- update verification;
- emergency revocation.

## 14. Verification Plan

List evidence required across the five layers:

- static checks;
- unit/component tests;
- adversarial tests;
- physical/real-environment tests;
- penetration/independent review;
- release evidence.

Every high-risk mitigation should have a test or review path.

## 15. Residual Risk

For each residual risk record:

- description;
- severity;
- likelihood;
- compensating controls;
- owner;
- target section/release;
- acceptance authority.

Critical risks cannot be accepted merely for schedule convenience.

## 16. Review Trigger

Repeat the threat model when any of these materially change:

- trust boundary;
- identity/authentication;
- capabilities;
- cryptography;
- provider;
- storage;
- supported device class;
- network topology;
- update mechanism;
- sensitive data category;
- production exposure.
