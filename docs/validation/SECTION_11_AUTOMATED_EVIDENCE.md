# Section 11 — Automated Evidence

## Acceptance State

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

This evidence closes the automated/pre-device obligations for Section 11 only. It does not claim that real OS service installation, reboot/crash recovery, sleep/wake, real disk interruption, secure production key provisioning, real network reconnect, resource pressure, filesystem sandboxing, privileged OS behavior or independent Computer Agent security review have passed Layer 4.

## Accepted Implementation Candidate

- Commit: `e3cc7e8d64b89f584d3cb2f64a052d7f553c495b`
- Branch: `mudrik-core-v1`
- Candidate message: `Add durable computer agent runtime`

## Validation Evidence

### Mobile Core Validation

- Workflow: `Mobile Core Validation`
- Run number: `#726`
- Run ID: `36358953372`
- Head SHA: `e3cc7e8d64b89f584d3cb2f64a052d7f553c495b`
- Result: **SUCCESS**

Local exact-candidate checks before push:

- Computer Agent regressions: **71/71 PASS**;
- whole Mobile Core regressions: **792/792 PASS**;
- TypeScript: **PASS**;
- lint: **PASS**;
- Expo Doctor: **21/21 PASS**;
- protocol JSON parsing: **PASS**;
- `git diff --check`: **PASS**.

### Security / Supply Chain

- tracked sensitive-file gate: **PASS**;
- worktree secret-signature scan: **PASS**;
- full Git-history secret-signature scan: **PASS**;
- dependency gate: **0 Critical / 0 High / 2 reviewed Moderate**.

The reviewed Moderate advisories are existing transitive dependencies in the whole-project dependency graph:

- `uuid@7.0.3` through Expo configuration/xcode tooling;
- `decode-uri-component@0.2.2` through `expo-router -> query-string`.

They do not create Computer Agent authority and are not treated as exceptions to Section 11 authorization rules.

### CodeQL

- Workflow: `CodeQL Security Analysis`
- Run number: `#621`
- Run ID: `36358953373`
- Head SHA: `e3cc7e8d64b89f584d3cb2f64a052d7f553c495b`
- Result: **SUCCESS**
- JavaScript/TypeScript analysis: **PASS**

## Implemented Section 11 Controls

The accepted candidate includes:

- strict versioned Computer Task envelope parsing;
- Ed25519 signature verification against configured trusted signer material;
- exact account and destination-device binding;
- trusted-time expiry and bounded future-task rejection;
- replay protection for task IDs and nonces;
- replay-protection reconstruction after process restart;
- deterministic lifecycle transitions;
- durable local task records with atomic replacement;
- restrictive local directory/file permissions;
- HMAC integrity tags over durable task state;
- mandatory non-persisted durable-store integrity key input;
- exact duplicate delivery idempotence;
- durable in-flight marker before tool execution;
- durable per-step checkpoint after known completion;
- uncertain in-flight step blocking after restart rather than automatic replay;
- restart pause when no step was in flight;
- durable Pause/Cancel state before process abort;
- per-task mutation serialization preventing lost updates between lifecycle/checkpoint/event writers;
- monotonic sanitized durable task-event sequencing;
- observer callback isolation from authoritative durable state;
- deep immutable copies of signed nested task input;
- rejection of secret-like plaintext fields/values in durable task content;
- strict permission-grant parsing;
- exact device/capability/mode/time/scope checks;
- current grant re-evaluation before every step;
- effective terminal default cwd/timeout included in policy evaluation;
- bounded max-duration policy;
- direct argv terminal execution with no shell interpolation;
- protocol-contract regression checks tying schemas to runtime vocabularies;
- no unauthenticated inbound shell/control listener introduced.

## Adversarial Evidence Highlights

Regression coverage proves at minimum:

- signature tampering fails;
- wrong account/device/signer fails;
- non-Ed25519 trusted signer material fails;
- duplicate signer identities fail;
- expired/future task admission fails;
- task-ID conflict and nonce reuse fail;
- replay protection survives runtime restart;
- persisted task tampering is detected before execution;
- wrong durable-store integrity key cannot read accepted state;
- structurally valid lifecycle tampering still fails HMAC verification;
- parsed signed nested input cannot be mutated through the original caller object;
- raw secret-like durable task content fails;
- malformed grant modes/scopes and future-created grants fail closed;
- implicit/default terminal cwd cannot bypass filesystem scope;
- implicit/default timeout cannot bypass grant duration;
- revocation after one completed step blocks the next step;
- missing grants leave durable approval state rather than running;
- pause/cancel during an actual running process persists control state before abort;
- interrupted in-flight work cannot auto-resume;
- concurrent event appends preserve every sequence without lost updates;
- pause/checkpoint races preserve both durable facts;
- corrupt/truncated durable records fail safely;
- successful completed tasks are not replayed after restart;
- observer exceptions cannot convert durable success into runtime corruption.

## Closed Defects

See `docs/validation/SECTION_11_DEFECTS.md`.

No known unresolved Blocker, Critical or High Section 11 defect remains in the automated/pre-device scope at the accepted implementation candidate.

## Deferred Layer 4 / Production Obligations

Still mandatory before final production closure:

- real Linux service installation and boot/reboot behavior;
- crash/kill recovery under real OS scheduling;
- user logout/login;
- sleep/wake;
- secure OS keyring/device-keystore provisioning for the durable-state integrity key;
- integrity-key rotation/migration/recovery;
- real filesystem interruption and disk-full behavior;
- local emergency Disconnect/Pause;
- real network loss/reconnect;
- CPU/memory/disk pressure;
- actual OS permission/elevation behavior;
- filesystem realpath/symlink/TOCTOU confinement and wider tool sandbox work from Section 12;
- independent Computer Agent security review;
- production Control Plane interoperability once Sections 14/20 reach those gates.

## Acceptance Rule

Section 11 is accepted only at the pre-device level. A signed task is still not authority by itself: current permission grants and risk policy are rechecked before every execution step. Duplicate delivery, restart and recovery must not create new authority or silently replay an uncertain external side effect.
