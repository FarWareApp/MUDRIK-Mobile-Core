# MUDRIK Computer Agent

This directory defines the first contract for the local computer-execution component.

The production Computer Agent is a small locally installed service, not a browser extension and not a privileged website process.

## Responsibilities

- pair a computer to the user's MUDRIK account;
- keep the private device key local;
- maintain an authenticated outbound session to the MUDRIK Control Plane;
- receive signed task envelopes;
- evaluate capability grants and risk policy;
- request approval when the requested task crosses a permission boundary;
- execute approved tools locally;
- stream structured progress and terminal output;
- support Stop / Pause / Cancel;
- preserve local audit events;
- redact sensitive values before remote diagnostics/logging;
- expose an emergency local Disconnect/Pause control.

## Non-Responsibilities

The agent must not:

- grant itself administrative privileges;
- execute unsigned/expired/replayed tasks;
- expose an unauthenticated remote shell;
- upload arbitrary local files without explicit task scope;
- expose stored secret plaintext to the Web Console when a secret reference/injection flow is sufficient;
- silently expand a permission grant beyond the path/command/domain scope approved by the user.

## Initial Linux MVP

Recommended first tool adapters:

1. `terminal` — spawn commands with cwd, environment allowlist, timeout and output limits.
2. `filesystem` — read/write/list within allowed roots.
3. `git` — status/diff/log/branch/commit/push according to granted scope.
4. `process` — inspect/start/stop agent-owned or explicitly approved processes.
5. `screen` — optional user-approved screenshot capture.

Browser automation and privileged system tools should come after the core policy engine is tested.

## Protocol

Schemas in `computer-agent/protocol/` are versioned contracts between Web/Mobile/Control Plane and the local agent.

The agent should reject unknown major protocol versions.

## Execution State

Expected task states:

- `draft`
- `awaiting_approval`
- `approved`
- `queued`
- `running`
- `blocked`
- `succeeded`
- `failed`
- `cancelled`

The agent should emit progress as events with a task ID and monotonically increasing sequence number so the UI can reconnect without losing state.

## Security Baseline

Default deny. Every local action maps to one or more capabilities. High/critical actions require fresh approval unless explicitly covered by a narrow policy that is itself allowed to cover that risk class.

The Computer Agent production runtime must remain deployable independently from the Mobile Core.
