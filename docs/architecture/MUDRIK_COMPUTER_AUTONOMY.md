# MUDRIK Computer Autonomy Architecture

Status: Accepted architectural direction — 2026-09-12

## Product Direction

MUDRIK will not require a traditional full desktop application as the primary computer interface.

The target product shape is:

1. **MUDRIK Mobile App** — native mobile client for chat, voice, notifications, approvals, projects and remote task control.
2. **MUDRIK Web Console** — browser-based desktop interface for conversations, projects, task planning, terminal output, files, approvals and activity history.
3. **MUDRIK Computer Agent** — a small local service installed on the user's computer. It is the only component allowed to touch the local terminal, files, processes, browser automation or other operating-system capabilities.
4. **MUDRIK Control Plane** — authenticated backend responsible for identity, task routing, device pairing, encrypted session coordination, task state and audit metadata. It must not silently grant local privileges.
5. **MUDRIK Intelligence Router** — optional AI layer that plans work and produces structured task requests. It never receives unrestricted implicit authority over the computer.

The Web Console is a control surface, not a privileged local process. Browser sandbox restrictions are treated as a security boundary, not something to bypass.

## Core Principle

The website asks. The local agent decides whether the requested capability is currently authorized. The operating system remains the final authority.

No task may execute locally unless all of the following are true:

- the computer is paired to the user's account;
- the task envelope is authenticated and has not expired;
- the task requests known capabilities only;
- requested capabilities are inside the user's current grant;
- the risk policy permits automatic execution or the required approval has been received;
- the task has not already been consumed or cancelled.

## Pairing

Recommended pairing flow:

1. User installs MUDRIK Computer Agent.
2. Agent generates a device key pair locally.
3. Agent displays a one-time pairing code / QR code.
4. User opens MUDRIK Web Console or Mobile App and approves the pairing.
5. Backend binds the public device key to the user's account.
6. Agent establishes an outbound authenticated connection to the Control Plane.
7. No inbound public port is required by default.

Pairing tokens must be short-lived, one-use and revocable.

## Capability Model

Capabilities are explicit and composable. Suggested baseline:

- `terminal.read`
- `terminal.execute`
- `filesystem.read`
- `filesystem.write`
- `filesystem.delete`
- `git.read`
- `git.write`
- `process.read`
- `process.start`
- `process.stop`
- `browser.read`
- `browser.control`
- `screen.capture`
- `network.outbound`
- `clipboard.read`
- `clipboard.write`
- `secrets.use`
- `system.settings`
- `system.admin`

`secrets.use` means a secret may be injected into an approved operation without exposing the plaintext secret to the model or Web Console when avoidable.

## Permission Scopes

A grant should include more than a capability name. It may also constrain:

- allowed filesystem roots;
- allowed repositories;
- allowed commands or executable families;
- allowed domains / hosts;
- whether network access is allowed;
- whether background execution is allowed;
- maximum task duration;
- maximum output size;
- expiration time;
- whether a capability is one-shot, session-scoped or persistent;
- whether elevation is permitted.

Example: `filesystem.write` for `~/MUDRIK-Mobile-Core` does not imply permission to write to the entire home directory.

## Risk Levels

### Low

Read-only inspection, listing files, reading git state, reading logs, checking versions and other reversible observations.

May run automatically when already granted.

### Medium

Creating or modifying ordinary project files, installing project dependencies, running tests, starting development processes, local browser automation and git commits.

May run automatically only inside an explicit persistent grant. Otherwise approval is required.

### High

Deleting files, force operations, pushing to protected branches, changing system configuration, stopping critical processes, using secrets, package-manager operations requiring elevation, or actions with meaningful external side effects.

Requires explicit task approval or a narrowly defined policy grant.

### Critical

Administrative/root operations, destructive disk operations, credential export, security-control changes or actions outside the user's configured safety policy.

Must never execute silently. Require a fresh explicit approval and operating-system elevation where applicable.

## Task Lifecycle

Suggested lifecycle:

`draft -> awaiting_approval -> approved -> queued -> running -> blocked | succeeded | failed | cancelled`

The agent should stream structured progress events, not only raw terminal text.

Each task has:

- unique task ID;
- user/account ID;
- paired device ID;
- source (`web`, `mobile`, `automation`, `api`);
- human-readable intent;
- requested capabilities;
- risk level;
- approval requirement;
- workspace constraints;
- execution steps;
- timestamps / expiry;
- replay-protection nonce;
- signed task envelope;
- audit events.

## Execution Model

The Computer Agent should expose tools rather than a single unrestricted shell primitive.

Recommended tool families:

- terminal command runner;
- file reader/writer;
- git client;
- process manager;
- browser automation adapter;
- package/build/test adapters;
- screenshot adapter;
- optional application-specific adapters.

A raw terminal tool can exist, but policy evaluation must still happen before every command execution.

## Autonomous Work

MUDRIK may perform multi-step work autonomously inside an approved task scope.

Example:

1. inspect repository;
2. understand failure;
3. edit files;
4. run tests;
5. inspect failures;
6. revise implementation;
7. commit changes;
8. report result.

The agent does not need repeated approval for every step when the full sequence stays inside the approved capabilities and workspace. Crossing a permission or risk boundary pauses the task and requests approval.

## Approval UX

Approvals must clearly state:

- what MUDRIK wants to do;
- on which computer;
- in which directory/application;
- which capabilities are required;
- whether the action is reversible;
- whether network access or secrets are involved;
- whether approval is one-time or persistent.

Mobile should be able to approve a task initiated from the Web Console, and the Web Console should be able to approve a task initiated from Mobile.

## Security Rules

- Default deny.
- No plaintext long-lived pairing secrets in browser storage.
- Device private keys stay on the paired computer.
- Prefer outbound agent connections; do not expose an unauthenticated local HTTP control port.
- Every command/task is bound to a user, device and expiry.
- Reject replayed task IDs/nonces.
- Maintain a tamper-evident audit trail for privileged actions.
- Sensitive output must be redacted before cloud logging.
- Never upload arbitrary local files unless the task explicitly authorizes that file/path and transfer.
- Do not grant `system.admin` as a side effect of ordinary terminal permission.
- Revocation must immediately invalidate future task execution.
- Agent update packages must be signed.
- The agent should have an emergency local Pause/Disconnect control.

## High-Assurance Real-Time Control Plane Requirement

The production path between Mobile/Web and the Computer Agent must not be implemented as an ordinary best-effort backend.

The normative server/transport requirements are defined in:

`docs/architecture/MUDRIK_REALTIME_CONTROL_PLANE.md`

The required architecture includes:

- protected Internet edge with DDoS/WAF/abuse controls;
- horizontally scalable regional real-time gateways;
- persistent outbound authenticated agent sessions;
- modern encrypted transport with no plaintext fallback;
- short-lived device-bound sessions;
- command authentication independent from TLS;
- nonce/sequence/expiry replay protection;
- durable task/event persistence outside gateway memory;
- replay-safe reconnect/resume;
- at-least-once durable delivery plus idempotent consumers rather than false network-level exactly-once claims;
- high-priority revoke/cancel paths;
- transactional durable state plus low-latency durable event routing;
- backpressure, overload shedding and slow-consumer controls;
- p50/p95/p99 latency measurement;
- multi-instance/high-availability design and tested recovery;
- privacy-safe observability and security audit trails;
- explicit database/broker backup and restore exercises.

The Control Plane is a secure coordination system. It does not execute local OS operations and does not bypass the Computer Agent capability/policy layer.

## Offline Behavior

The agent may support local/offline tasks when the user is physically using the computer and the task is created locally. Remote Web/Mobile control requires an authenticated communication path.

Queued cloud tasks must not execute after an excessive delay unless their envelope is still valid and their approval remains valid.

## Web Console

The Web Console should provide:

- Chat / task composer;
- computer selector;
- online/offline device state;
- terminal stream;
- file changes / diff viewer;
- approvals panel;
- project/workspace selector;
- task plan and current step;
- Stop / Pause / Resume;
- audit history;
- permission manager;
- connected devices;
- secret references without displaying secret values;
- task retry/recovery;
- optional browser preview / screenshot stream.

## Mobile App Role

Mobile remains a first-class control surface. It should eventually support:

- start a computer task remotely;
- approve/reject permission escalation;
- view progress;
- Stop/Pause a task;
- receive completion/failure notifications;
- inspect concise diffs/results;
- revoke a computer or session.

The current Mobile Core remains decoupled from this system until `MOBILE-CORE-FROZEN` is created.

## Repository Boundary

Do not mix Computer Agent runtime code into the frozen Mobile Core modules.

Initial protocol/security specifications may live in this repository while the architecture is being defined. Production Web Console, Control Plane and Computer Agent should become independently deployable packages/services (and may later move to separate repositories) with a shared versioned protocol package.

## Initial Delivery Order

1. Freeze Mobile Core after physical-device validation.
2. Define versioned computer-agent protocol and capability schema.
3. Build local Computer Agent MVP for Linux first.
4. Add secure pairing and outbound session channel.
5. Build Web Console task/terminal/approval UI.
6. Add file/git/process tools.
7. Add policy engine and scoped persistent permissions.
8. Add autonomous multi-step task runner.
9. Connect Mobile approvals/notifications.
10. Add Windows and macOS agents.
11. Add browser-control and richer computer-use adapters.
12. Add production intelligence routing after protocol/security tests pass.

## Linux-First Target

The first Computer Agent target is Linux because the current development environment already uses Linux. Windows and macOS implementations should reuse the same protocol and capability model while providing platform-specific adapters.
