# Section 11 — Durable Computer Agent Runtime Gate

## Status

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

Accepted automated/pre-device implementation candidate:

- commit `e3cc7e8d64b89f584d3cb2f64a052d7f553c495b`;
- Mobile Core Validation `#726` / ID `36358953372`: **SUCCESS**;
- CodeQL Security Analysis `#621` / ID `36358953373`: **SUCCESS**;
- Computer Agent regressions: **71/71 PASS**;
- whole Mobile Core regressions: **792/792 PASS**;
- Expo Doctor: **21/21 PASS**;
- dependency gate: **0 Critical / 0 High / 2 reviewed Moderate**;
- tracked/worktree/history secret gates: **PASS**.

Detailed evidence:

- `docs/validation/SECTION_11_AUTOMATED_EVIDENCE.md`;
- `docs/validation/SECTION_11_DEFECTS.md`.

Section 11 turns the existing Computer Agent Phase 0 policy/terminal prototype into a durable local execution runtime. It owns task admission, local task state, checkpoint/recovery, pause/resume/cancel and restart-safe lifecycle semantics. It does not broaden filesystem, git, browser, process or network capabilities; those adapter/sandbox responsibilities remain Section 12.

## Authoritative Architecture

- `docs/architecture/MUDRIK_COMPUTER_AUTONOMY.md`
- `docs/architecture/MUDRIK_REALTIME_CONTROL_PLANE.md`
- `docs/architecture/MUDRIK_CONTROL_PLANE_THREAT_MODEL.md`
- `docs/architecture/MUDRIK_20_SECTION_EXECUTION_PLAN.md`

Target boundary:

`Authenticated Task Envelope -> Replay-Safe Admission -> Durable Task Record -> Lifecycle/Checkpoint -> Per-Step Policy Recheck -> Adapter Execution`

## Scope

- strict versioned task-envelope validation;
- signed/authenticated remote task admission;
- exact account/device binding;
- trusted-time expiry checks;
- task-ID and nonce replay protection;
- durable local task store;
- deterministic task lifecycle;
- pause/resume/cancel;
- per-step checkpoints;
- restart/crash recovery;
- idempotent task acceptance and completion;
- structured monotonically sequenced task events;
- bounded recovery of interrupted tasks;
- safe local disconnect/pause semantics;
- no unauthenticated inbound raw shell.

## Explicit Non-Goals

- no broad filesystem/git/process/browser implementation beyond Phase 0 terminal support;
- no new Section 12 capability widening;
- no production Control Plane transport implementation;
- no automatic root/elevation;
- no remote task execution without authenticated envelope verification;
- no trust inferred from LAN proximity, Web UI state or AI/model output;
- no plaintext long-lived signing/private keys in task records;
- no task restart that silently repeats an already-completed irreversible step;
- no claim of exactly-once network delivery.

## Core Invariants

1. Unknown protocol major versions fail closed.
2. Remote task admission requires valid signature provenance.
3. Task account/device binding is exact.
4. Trusted evaluation time, not task-provided clock, decides expiry.
5. Task IDs and nonces are replay protected.
6. Exact duplicate delivery may be idempotent; conflicting reuse fails closed.
7. Durable state must survive process restart.
8. State transitions are deterministic and explicitly validated.
9. Terminal/tool execution is impossible before accepted task admission.
10. Every step is re-authorized at execution time.
11. Pause/cancel state is durable before more work starts.
12. Checkpoints identify completed steps and the next safe resume point.
13. Restart recovery never blindly replays a completed step.
14. Terminal commands execute argv directly without shell interpolation by default.
15. Task/event records do not persist raw secret plaintext.
16. Revocation or grant expiry after admission can still block later steps.
17. Critical work cannot inherit approval from ordinary task admission.
18. A model may propose a task but cannot sign, approve or widen it.
19. No unauthenticated inbound shell/control port is introduced.
20. Every runtime decision remains locally auditable.

## Layer 1 — Specification / Static Correctness

Required evidence:

- exact-key runtime parsers matching protocol schemas;
- bounded IDs, strings, arrays and timestamps;
- canonical signed payload representation;
- cryptographic signature verification against trusted signer material;
- no hidden authority fields;
- explicit lifecycle transition table;
- atomic durable-write strategy;
- lint/syntax/dependency/secret gates green.

## Layer 2 — Unit / Component Verification

Mandatory cases include:

- valid signed task accepted;
- invalid signature rejected;
- wrong account/device rejected;
- expired/future malformed envelopes rejected;
- exact duplicate delivery is idempotent;
- task-ID or nonce conflict/replay rejected;
- lifecycle invalid jumps rejected;
- pause/resume/cancel are idempotent where appropriate;
- checkpoint progression is monotonic;
- completed step cannot be silently replayed;
- durable store round-trip and process-restart reload;
- corrupt/truncated store fails safely;
- atomic replacement does not expose half-written state.

## Layer 3 — Integration / Security / Adversarial Verification

Mandatory cases include:
- signer substitution;
- envelope field tampering after signing;
- nonce reuse across task IDs;
- task-ID reuse with different payload;
- device/account substitution;
- clock rollback/future manipulation;
- grant revocation after admission before a later step;
- pause/cancel race with step completion;
- restart while running;
- restart after checkpoint persistence but before next step;
- duplicate remote delivery during/after execution;
- hidden shell/script/credential fields;
- workspace/path scope escape attempts;
- event-sequence replay/conflict.

## Layer 4 — Physical / Real-Environment Verification

**DEFERRED** under the owner-directed physical-validation exception.

Before production closure verify Linux service installation, restart after crash/reboot, user logout/login behavior, filesystem durability, process termination, local Pause/Disconnect, network loss/reconnect, sleep/wake, resource pressure and actual OS permission/elevation behavior.

## Layer 5 — Evidence / Release Gate

Pre-device completion requires:

- exact candidate SHA;
- Computer Agent tests green;
- whole Mobile Core regression green;
- Mobile Core Validation green;
- CodeQL green;
- zero unresolved Blocker/Critical/High Section 11 defects;
- dependency/secret gates green;
- defect/evidence records;
- Layer 4 and independent Computer Agent security-review obligations explicit.

## Acceptance Rule

The Computer Agent may autonomously continue approved work only inside an authenticated, replay-safe and durable task scope. Restart, reconnect or duplicate delivery must never create new authority or silently repeat completed privileged work.
