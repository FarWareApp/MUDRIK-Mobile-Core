# MUDRIK Computer Agent

This directory contains the local Computer Agent runtime. It is intentionally independent from the Mobile Core and is designed as a small locally installed service rather than a browser extension or privileged website process.

## Current Architecture Boundary

The implementation is split into explicit layers:

- **Phase 0 terminal adapter** — bounded argv execution with no shell interpolation, timeout/output limits and capability policy rechecks.
- **Section 11 durable runtime** — signed task admission, replay protection, durable lifecycle/checkpoints, restart recovery, pause/resume/cancel and tamper-evident local task state.
- **Section 12 tooling sandbox** — broader filesystem, Git, process, browser, screen, network and privileged-tool adapters. These capabilities are not implied by Section 11.

The Section 11 execution boundary is:

\`Authenticated Task Envelope -> Replay-Safe Admission -> Durable Task Record -> Lifecycle/Checkpoint -> Per-Step Policy Recheck -> Adapter Execution\`

## Durable Runtime Guarantees

\`DurableComputerAgentRuntime\` provides signed task verification, exact account/device binding, task-ID and nonce replay protection across restart, deterministic lifecycle transitions, atomic persistence, sequenced sanitized events, per-step policy reauthorization, durable in-flight markers, safe restart recovery, durable Pause/Cancel, and HMAC integrity for local task records.

A durable task record does **not** grant execution authority by itself. Current grants are rechecked before every step. If restart finds an in-flight step whose final result is unknown, the task is blocked as \`uncertain_step\` instead of replaying the action.

## Integrity Key

\`DurableTaskStore\` requires a binary integrity key of at least 32 bytes. The key is deliberately not stored in task JSON, task events, repository files or logs.

Production provisioning must obtain this key from protected OS/device secret storage such as an operating-system keyring or equivalent secure storage. Key provisioning, secure rotation/migration and platform-specific protection must be validated before production release.

HMAC provides tamper evidence only while the integrity key remains protected. It is not a claim that an attacker with unrestricted access to both process secrets and storage cannot alter local state.

## Permissions

Default deny is mandatory. A permission grant is parsed and bounded before use. The runtime checks exact device, capability, grant mode, trusted-time creation/expiry/revocation, explicit filesystem roots and executables for terminal execution, domain scope where applicable, background/elevation flags and configured duration limits.

High and critical task policy remains independently gated. A signed task never substitutes for a capability grant or a required approval.

## Pause, Cancel and Recovery

Pause and Cancel are durable controls: state is persisted before abort is sent to active terminal execution.

On restart, a running task with no in-flight step is durably paused and may later resume after policy recheck. A running task with an in-flight step is durably blocked because the external side effect may already have occurred even if its final checkpoint was not written.

## Protocol

Versioned contracts live in \`computer-agent/protocol/\`. The durable task contract requires account identity, device identity, signer-key identity, expiry, nonce, requested capabilities, steps and a signature. Unknown task or step fields fail closed.

Durable events use a strict separate schema and contain bounded state references/reason codes only. They do not persist arbitrary stdout/stderr, credentials or secret plaintext.

## Security Baseline

The agent must not grant itself administrative privileges; execute unsigned, expired or replayed remote tasks; infer authority from model output, UI state, LAN proximity or stored task state; expose an unauthenticated inbound shell; persist plaintext credentials; silently widen scope; or automatically replay an uncertain interrupted action.

The terminal adapter uses direct argv spawning with \`shell: false\`.

## Section 12 Boundary

Section 11 does not claim a complete operating-system sandbox. Filesystem realpath/symlink/TOCTOU confinement, Git/process/browser/screen/network adapters, privileged-operation mediation and adapter-specific isolation are Section 12 work. Lexical path checks alone are not a production filesystem-sandbox claim.

## Deferred Physical / Production Validation

Before production closure the Computer Agent still requires real-environment validation for OS service installation and reboot, user logout/login, sleep/wake, crash/kill recovery, protected integrity-key provisioning and rotation, filesystem interruption/disk-full behavior, local Disconnect/Pause, network loss/reconnect, resource pressure, OS permission/elevation behavior and independent security review.

The final production gate remains Section 20.
