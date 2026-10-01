# MUDRIK Smart-Home, External Integrations and Automation

## Purpose

Section 19 provides a provider-neutral framework for supported smart-home devices and external services without allowing vendor discovery, model output, routines or automation state to manufacture authority.

Target boundary:

`Vendor Adapter -> Untrusted Discovery -> Approved Device/Service Binding -> Capability Policy -> Command/Routine/Automation Intent -> Authorization -> Adapter Invocation -> Result/Audit`

Section 19 decides how supported external capabilities are represented and safely invoked. It does not weaken Sections 11/12, the Control Plane, account/session security, or approval boundaries.

## Core Principles

1. Discovery is descriptive data, never permission.
2. A discovered device/service must be explicitly admitted before commands are eligible.
3. Vendor APIs may report capabilities, but only MUDRIK capability vocabulary determines command semantics.
4. Unknown vendor features remain unsupported rather than being guessed or emulated.
5. Every target is account/workspace/integration/device bound.
6. Wildcard or broadcast targets are forbidden unless a separately approved routine enumerates exact targets.
7. Room/device aliases are presentation metadata, not authority.
8. High-risk capabilities never qualify for silent instant execution.
9. Routines/scenes may contain only admitted exact actions and are revision-bound.
10. Automations may invoke only actions allowed by their exact automation policy and granted capabilities.

11. Automation triggers never widen action authority.
12. Cross-device actions must enumerate every target explicitly.
13. Vendor credentials remain adapter-private and never enter Mobile/UI/model-visible projections.
14. Device state and vendor errors are untrusted external data.
15. AI/model output may propose integration intents but cannot approve them.
16. Lock/unlock, open/close access control, alarm arm/disarm, payment/purchase, camera/microphone exposure and safety-critical device actions use explicit high-risk policy.
17. Missing vendor capability produces `unsupported_capability`; no hidden fallback to another action.
18. Revocation immediately invalidates stale command/routine/automation projections.
19. Audit records contain stable IDs and reason codes, not vendor credentials or private payloads.
20. All integration outputs grant zero local execution, sensor, approval or capability authority.

## Capability Classes

The core vocabulary separates:

- read-only state;
- low-risk reversible control such as power/level/media;
- environmental control such as thermostat targets;
- access control such as lock/unlock or garage/gate open;
- security control such as alarm arm/disarm;
- privacy-sensitive camera/microphone actions;
- commerce/payment actions;
- routine/scene execution.

Each capability carries a risk class and authorization mode. Vendor-specific names map into this vocabulary only through adapter mapping.

## Device Admission and Aliases

Discovery records are bounded, revisioned and adapter-scoped. Admission creates an account/workspace-bound durable device binding with exact capability IDs. Aliases and rooms are separate user-controlled metadata and cannot change the underlying target identity.

Removing or revoking a binding invalidates issued command projections and any routine/automation referencing the revoked target.

## Instant Commands

Instant commands are permitted only when:

- the device binding is active;
- the requested capability is currently admitted;
- policy allows the risk class;
- required approval mode is satisfied;
- the action arguments match the capability schema;
- the target revision is current;
- no wildcard target is used.

High-risk actions cannot be downgraded by adapter metadata.

## Routines, Scenes and Automations

A routine is a versioned ordered list of exact admitted actions. Updating a routine creates a new revision; stale projections cannot execute.

An automation binds a trigger to an exact approved routine or bounded action set. Trigger data is non-authoritative. Automations are permission-, revision-, frequency- and time-bounded and can be paused/revoked independently.

## Deferred Real-Environment Obligations

Production closure requires real vendor adapters, real smart-home devices/services, credential vault/key lifecycle, network outages, device disappearance/replacement, rate limits, cloud/local hub behavior, high-risk approval UX, real routine recovery, automation scheduling durability, privacy review and independent security testing.

## Capability and Execution Separation

Section 19 extends the core capability vocabulary with:

- `home.device.read` for bounded smart-home state reads;
- `home.access.control` for lock/unlock/open access control;
- `home.security.control` for alarm/security control.

These remain subject to the existing Section 11/12 capability-grant machinery. Section 19 does not create a parallel execution authority.

## Automation Execution Provenance

An accepted automation trigger produces a short-lived `IntegrationAutomationExecution` bound to the exact policy revision, automation revision, routine revision, ordered action list and trigger event.

Every automation command carries:

- the exact execution ID;
- the exact action index.

The registry verifies that the command matches that action byte-for-byte at the semantic field level. A claimed action cannot be rebound to another command ID with different semantics. Duplicate retries of the same command remain idempotent; conflicting replays fail closed.

Pausing/revoking the automation, changing policy/routine revision, revoking a binding or expiring the execution prevents later automation commands from being authorized.

## Adapter Invocation and Result Boundary

After command authorization the registry may issue a credential-free adapter invocation containing only the exact admitted target/action metadata.

Provider/vendor credential references remain inside the internal registry adapter-binding boundary and are never copied into invocation, result, audit or public adapter projections.

Adapter results are accepted only for a command ID with an issued invocation and must match its binding/device/adapter/integration identity. Result replay is idempotent; conflicting result replay fails closed.

Audit contracts contain stable identifiers, capability IDs and reason codes only. Raw vendor payloads, credentials and private command/result bodies are not accepted by the audit schema.

## Revocation and Replay Rules

- binding revocation is available even when vendor discovery has disappeared;
- stale binding revisions invalidate commands and routines;
- policy revision invalidates stale routines/automations/commands;
- routine and automation revisions are monotonic;
- duplicate trigger events return the same short-lived execution;
- conflicting trigger replay is rejected;
- automation run rate limits are enforced per automation revision;
- cross-device routines enumerate each exact binding/device/revision;
- wildcard targets are structurally invalid.
