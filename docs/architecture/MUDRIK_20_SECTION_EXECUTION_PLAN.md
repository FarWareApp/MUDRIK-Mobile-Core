# MUDRIK 20-Section Execution Plan

## Purpose

MUDRIK development is divided into twenty sequential sections. Each section is treated as a closed engineering unit with explicit scope, completion criteria, evidence, security review, and a five-layer validation gate.

The next section must not enter implementation until the current section is closed. Future sections may be researched or documented, but they must not be coupled into the active runtime before their turn unless a critical dependency requires a narrowly scoped exception that is recorded in this document.

The objective is not speed at the expense of correctness. The objective is controlled progress with high engineering quality, strong security, reproducibility, and measurable evidence.

## Non-Negotiable Working Rule

For every section:

1. define the exact scope and non-goals;
2. complete the implementation;
3. complete all five validation layers;
4. fix every blocker, critical defect and high-severity defect within scope;
5. record evidence and known limitations;
6. commit the completed section;
7. obtain a green CI result where CI applies;
8. tag major stable milestones where appropriate;
9. only then unlock implementation of the next section.

A section is not considered complete because the code compiles, because a feature works once, or because an AI/model says it looks correct.

## Five-Layer Validation Gate

Every section passes the same five quality layers, adapted to the section's risk and platform.

### Layer 1 — Specification and Static Correctness

Required evidence may include:

- requirements and threat assumptions are documented;
- architecture boundaries are explicit;
- interfaces and data contracts are versioned where needed;
- TypeScript/compiler/static-analysis checks pass;
- lint/schema/config checks pass where applicable;
- no known secrets are committed;
- dependencies and permissions introduced by the section are justified;
- accessibility, localization, RTL/LTR and privacy requirements are considered where relevant.

Failure at Layer 1 blocks all later layers.

### Layer 2 — Unit and Component Verification

Required evidence may include:

- deterministic unit tests;
- component/service tests;
- error-path tests;
- persistence and migration tests;
- boundary-condition tests;
- cancellation, timeout and retry tests;
- idempotency tests where repeated execution is possible;
- mocks/fakes only where they preserve the behavior being tested.

The section must prove both successful behavior and controlled failure behavior.

### Layer 3 — Integration, Security and Adversarial Verification

Required evidence may include:

- cross-module integration tests;
- authorization and capability-boundary tests;
- malformed-input tests;
- replay/duplicate-message tests;
- prompt/tool injection tests where AI is involved;
- workspace/path escape tests where filesystem access is involved;
- tampering and untrusted-device tests where identity is involved;
- privacy-state tests for sensors, memory and health data;
- failure isolation: compromise or failure in one component must not silently broaden authority.

Security defects rated Critical block completion. High-severity defects block completion unless formally downgraded with written technical evidence.

### Layer 4 — Real Environment / Physical E2E / Recovery Verification

Required evidence may include:

- real-device testing;
- clean-install and upgrade testing;
- background/foreground and restart testing;
- Wi-Fi/cellular/offline transitions;
- real permissions allow/deny/revoke flows;
- crash/restart recovery;
- data persistence and corruption handling;
- actual supported hardware/integration tests;
- latency and resource checks;
- user-visible error and recovery behavior;
- rollback/reconnect/resume behavior.

A simulator alone does not satisfy this layer when physical hardware or real OS behavior is part of the feature.

### Layer 5 — Release, Independent Review and Evidence Gate

Required evidence may include:

- final CI green against the exact candidate commit;
- final regression suite green;
- security checklist complete;
- release/update path verified;
- audit/diagnostic evidence retained without exposing sensitive data;
- documentation/status updated;
- unresolved limitations explicitly recorded;
- independent review for security-critical or safety-critical sections;
- milestone tag created when the section defines a stable platform boundary.

For high-risk sections such as authentication, Computer Agent, observation/privacy, Emergency Guardian or production deployment, Layer 5 should include an independent security review or penetration-test plan before broad production release.

## Severity and Stop Rules

- **Blocker**: work stops until fixed.
- **Critical**: section cannot close.
- **High**: section normally cannot close; exception requires written rationale and compensating controls.
- **Medium**: must be fixed when it affects correctness, security, privacy or the completion criteria; otherwise tracked with an owner and target section.
- **Low**: may be deferred when it does not threaten the section's acceptance criteria.

If a defect reveals an architectural weakness, fix the architecture rather than only patching the symptom.

## Evidence Rule

Every closed section should leave an auditable package of evidence, as applicable:

- commit SHA;
- CI run;
- tests executed;
- physical-device results;
- security checks;
- migrations performed;
- known limitations;
- rollback/recovery result;
- milestone tag.

No undocumented "it worked on my machine" completion.

---

# Section 1 — Mobile Core Freeze

**Status: ACTIVE. No later section may enter production implementation before this closes.**

Scope:

- complete the mandatory physical-device/E2E matrix already defined in `MUDRIK_STATUS.md`;
- repair every blocker/critical defect found;
- verify persistence, lifecycle, connectivity, permissions, attachments, chat, projects, notifications, settings, Reduced Motion, RTL/LTR, diagnostics, voice recorder/player and accessibility;
- re-run TypeScript, Expo Doctor and current automated protocol tests;
- obtain green GitHub Actions on the exact final candidate;
- create `MOBILE-CORE-FROZEN` only after the physical gate passes.

Non-goals:

- no production AI/server transport coupling into Mobile UI;
- no major new feature implementation during the freeze gate.

Completion milestone: `MOBILE-CORE-FROZEN`.

# Section 2 — Platform Security Foundation

Scope:

- convert `MUDRIK_SECURITY_BASELINE.md` and the Security Assurance Program into enforceable code/configuration controls;
- secret management and key-handling rules;
- secure storage primitives;
- capability identifiers and default-deny enforcement primitives;
- security telemetry with privacy-safe logging;
- dependency/supply-chain scanning gates;
- signed-build/update design and provenance foundations;
- threat-model template and security review checklist.

Completion requires the five-layer gate plus adversarial negative tests.

# Section 3 — Account Identity, Authentication and Device Trust

Scope:

- account/session architecture;
- passkey-first design where supported;
- MFA/step-up paths for sensitive actions;
- device identity and cryptographic key binding;
- pairing/unpairing/revocation;
- session inventory and remote sign-out;
- short-lived credentials and rotation;
- recovery flow threat model.

No device is trusted merely because it is on the same network.

# Section 4 — Privacy, Permissions and Observation Control

Scope:

- implement the observation privacy state machine;
- truthful runtime sensor-state registry;
- `visual_off`, `ambient_off`, `privacy_lock` behavior;
- explicit resume semantics;
- camera/microphone/location/presence/health permission boundaries;
- visible privacy indicators;
- device-handoff privacy preservation;
- tests proving that app restart, model restart, room change or device handoff cannot silently re-enable disabled observation.

# Section 5 — Voice Runtime and Natural Command Layer

Scope:

- streaming STT abstraction;
- VAD/end-of-turn behavior;
- instant-command lane;
- reasoning lane boundary;
- multilingual/code-switching handling;
- barge-in/interruption;
- TTS abstraction and streaming playback;
- latency measurements;
- safe command cancellation;
- no AI-provider coupling to UI.

# Section 6 — Smart Companion Core

Scope:

- companion profile data model;
- selectable name/voice/avatar/personality dimensions;
- presence level;
- memory-policy binding interface;
- consistent identity across text/voice surfaces;
- companion behavior cannot grant permissions;
- one primary active companion initially.

# Section 7 — Cross-Device Presence and Handoff

Scope:

- trusted-surface registry;
- presence resolver;
- one-primary-surface arbitration;
- Follow Me policy;
- session handoff between mobile/web/display/headset surfaces;
- privacy classification of personal/shared/public surfaces;
- state preservation without permission inheritance;
- AR/VR/spatial presentation contracts where platform support exists.

# Section 8 — Ambient Device and Media Orchestration

Scope:

- normalized device/media intents;
- adapters for supported televisions, phones, computers and other approved devices;
- open app/channel/content controls;
- media handoff between devices;
- contextual content selection from explicit user preferences and ambient context;
- companion visual placement that avoids important screen content;
- explicit separation between contextual inference and claims about the user's emotional state.

# Section 9 — Smart Device Finder and Spatial Locating

Scope:

- paired-device resolver;
- UWB/Bluetooth/Wi-Fi/last-seen fusion where supported;
- confidence model;
- room/zone/furniture-level spatial descriptions only when supported by evidence;
- ring/vibrate/guided-search adapters;
- AR guidance where available;
- strict authorization so users can locate only permitted devices;
- no fabricated precision.

# Section 10 — Emergency Guardian

Scope:

- opt-in health/emergency monitoring architecture;
- sensor fusion and confidence/escalation state machine;
- fall/unresponsiveness workflows;
- emergency-contact and emergency-service routing where legally/platform supported;
- local-first critical path where practical;
- emergency privacy packet;
- simulation mode that can never contact real emergency services;
- jurisdiction-aware emergency behavior;
- medical-device/regulatory review before any diagnostic claim.

This is safety-critical and requires the strongest Layer 5 review before production use.

# Section 11 — Durable Computer Agent Runtime

Scope:

- durable local task store;
- idempotent task IDs;
- checkpoint/resume;
- restart recovery;
- pause/resume/cancel;
- execution lifecycle;
- signed/validated task-envelope acceptance boundary;
- no exposed unauthenticated raw remote shell;
- Linux-first implementation while preserving cross-platform protocol compatibility.

# Section 12 — Computer Agent Tooling and Capability Sandbox

Scope:

- filesystem adapter;
- git adapter;
- process/build/test adapters;
- browser/screenshot adapters when approved;
- scoped network access;
- secret-reference injection;
- per-step policy re-evaluation;
- path/workspace escape defense;
- destructive/admin actions remain independently gated.

# Section 13 — Coding Engine and Autonomous Work Runner

Scope:

- `CodingEngine -> ModelAdapter -> Provider` abstraction;
- provider-neutral task reasoning;
- strong coding workflow:
  `Understand -> Inspect -> Research -> Plan -> Implement -> Build -> Test -> Diagnose -> Repair -> Re-test -> Review -> Finish`;
- reviewer/worker separation where useful;
- completion requires verification evidence rather than code generation alone;
- no production secret committed to repository.

# Section 14 — Control Plane and Reliable Task Routing

Scope:

- authenticated device registry;
- outbound agent channel;
- task routing;
- approval records;
- event sequencing;
- replay protection;
- reconnect/replay-safe delivery;
- task/event persistence;
- kill/revoke controls;
- auditable state transitions.

# Section 15 — Web and Mobile Command Surfaces

Scope:

- lightweight Web command/control interface;
- paired-device status;
- task composer;
- progress states;
- approvals;
- Stop/Pause/Resume;
- result/diff/history;
- mobile remote-control parity where appropriate;
- browser remains a control surface, not an unrestricted OS executor.

# Section 16 — Memory System

Scope:

- long-term memory independent of model provider;
- conversation reconstruction;
- topic-matching retrieval;
- explicit memory policies;
- retention/deletion controls;
- privacy boundaries;
- conflict/version handling;
- context compaction without silently losing important user-approved information;
- fresh-conversation-by-default behavior with relevant prior-context retrieval.

# Section 17 — Knowledge Engine and Developer Knowledge System

Scope:

- RAG architecture;
- source metadata and versioning;
- official-documentation preference for technical tasks;
- domain indexes;
- embeddings/reranking abstraction;
- source freshness checks;
- licensing/provenance tracking;
- programming knowledge retrieval that injects only task-relevant information.

# Section 18 — Intelligence Router and Model/Provider Layer

Scope:

- general/coding/vision/STT/TTS provider abstraction;
- offline/online selection;
- health/latency/cost/quality-aware routing;
- fallback behavior;
- provider outage handling;
- no MUDRIK identity coupling to one provider;
- provider-specific credentials remain isolated from clients.

# Section 19 — Smart-Home, External Integrations and Automation

Scope:

- adapter framework for supported smart-home/services;
- capability discovery;
- device/room aliases;
- safe instant commands;
- routines/scenes;
- automation permissions;
- cross-device commands;
- explicit high-risk boundaries;
- graceful handling when a vendor API lacks a requested capability.

# Section 20 — Whole-System Integration, Security Certification and Production Release Gate

Scope:

- full-system E2E across Mobile, Web, Control Plane, Computer Agent, Voice, Companion, Memory, Knowledge and supported device integrations;
- full threat-model refresh;
- external penetration/security review for critical surfaces;
- disaster recovery and key-rotation exercise;
- incident-response exercise;
- privacy/regulatory review;
- performance/load/reliability tests;
- upgrade/rollback tests;
- final documentation;
- production release checklist;
- stable release tag only after all mandatory gates pass.

Section 20 is not merely a packaging step. It is the proof that independently strong subsystems remain secure and correct when connected together.

---

## Active Section Policy

At any moment the repository should identify exactly one primary implementation section as `ACTIVE`.

Allowed while a section is active:

- implement/fix/test the active section;
- document later sections;
- perform research needed to avoid architectural dead ends;
- repair an urgent cross-cutting security vulnerability.

Not allowed without explicit recorded exception:

- begin major implementation of a later section;
- couple unfinished future systems into the active runtime;
- skip a failed validation layer to save time;
- mark a section complete with unresolved blockers/critical issues;
- create a stable milestone tag before required physical/security evidence exists.

## Current Active Section

**Section 1 — Mobile Core Freeze**

Current blocker to closure: the mandatory physical-device/E2E validation matrix and any defects discovered during that validation.

## Completion Definition

MUDRIK progress is measured by closed sections, not by the number of features described or lines of code written.

A section is closed only when implementation, five-layer validation, evidence, security obligations and release documentation all agree that it is closed.
