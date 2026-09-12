# MUDRIK Web Console

The Web Console is the primary computer-facing MUDRIK interface.

It does **not** receive direct operating-system privileges from the browser. Privileged work is delegated to the paired MUDRIK Computer Agent running locally on the selected computer.

## Primary Screens

### Workspace / Chat

- conversation and task composer;
- project/workspace selection;
- selected computer/device;
- task plan;
- current step;
- live output;
- generated files/diffs;
- Stop / Pause / Resume.

### Computers

- paired devices;
- online/offline state;
- OS / agent version;
- last seen;
- revoke device;
- open permission manager.

### Approvals

- pending permission requests;
- exact capability and scope;
- risk level;
- one-time/session/persistent choice where allowed;
- approve/reject.

### Activity

- task history;
- task result;
- failure/retry state;
- audit events;
- searchable terminal/file/git activity metadata.

### Permissions

- capability grants per device;
- allowed filesystem roots;
- allowed repositories;
- allowed executables;
- network/domain scopes;
- expiration;
- background-execution permission;
- revoke immediately.

## UX Rule

The Web Console should feel like one continuous intelligent workspace rather than a remote-terminal product. Raw terminal output is available when useful, but MUDRIK should summarize what it is doing, explain blocks and surface diffs/results clearly.

## Device Connection

The browser connects to the MUDRIK Control Plane. The local Computer Agent also connects outbound to the Control Plane. The backend routes authenticated task envelopes and progress events between them.

The initial implementation should not require opening a public inbound TCP port on the user's computer.

## Approval Synchronization

A pending approval may be completed from Web or Mobile. The approval record is bound to the same task ID/device/capability scope and is not reusable for unrelated tasks.

## Initial Web MVP

1. Sign in.
2. List paired computers.
3. Select a computer.
4. Submit a text task.
5. Display requested capabilities and risk.
6. Approve when required.
7. Stream task events/output.
8. Stop task.
9. Display final result and file/git changes.
10. Revoke permissions/device.

Production UI implementation should live as an independently deployable web application after the Mobile Core freeze gate.
