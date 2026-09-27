# MUDRIK Computer Agent Tooling and Capability Sandbox

## Purpose

Section 12 turns the durable Computer Agent runtime into a constrained tool platform. Tool adapters must be narrower than a raw shell, validate exact inputs, derive their own minimum risk, expose policy context that matches actual execution and fail closed when the requested isolation cannot be enforced.

Target boundary:

`Signed Durable Task -> Strict Tool Contract -> Capability/Risk Floor -> Current Grant Recheck -> OS/Resource Sandbox -> Tool Adapter -> Sanitized Result`

No model, UI surface, task label or adapter may widen authority.

## Tool Families

The Section 12 pre-device scope covers:

- filesystem read/write/delete;
- Git read/write;
- process inspect/start/stop;
- build/test command profiles;
- browser read/control contracts;
- screenshot capture contracts;
- scoped outbound network;
- clipboard read/write;
- secret-reference injection;
- system/settings/admin contracts with independent gating.

Not every platform adapter must become production-ready during pre-device work. A capability remains unavailable when its required isolation cannot be proven.

## Capability Risk Floors

The signed task's declared risk is not authoritative enough to reduce inherent tool risk. Effective risk is the maximum of task risk, capability risk floor and operation-specific risk floor.

Baseline capability floors:

- low: read-only terminal/filesystem/git/process/browser observations;
- medium: terminal execution, filesystem write, git write, process start, browser control, network outbound, clipboard write;
- high: filesystem delete, process stop, screen capture, clipboard read, secrets use, system settings;
- critical: system admin.

Tool operations may raise these floors further. No operation may lower them.

## Filesystem Confinement

A lexical prefix check is insufficient.

Pre-device filesystem adapters must:

- accept only absolute or workspace-relative normalized paths;
- bind every operation to one or more explicitly granted filesystem roots;
- canonicalize granted roots;
- reject NUL and malformed paths;
- reject traversal outside the granted root;
- inspect every existing path component for symbolic links when mutation is involved;
- reject a symbolic-link final target for write/delete;
- use no-follow file opening where supported;
- bound file size, directory result count and output size;
- perform atomic replace for ordinary file writes where appropriate;
- never delete outside the exact authorized root.

OS-level race resistance remains required. Where a platform cannot provide a strong primitive against path-component replacement races, the adapter must either use a stronger sandbox/container boundary or keep the unsafe operation unavailable.

## Linux Execution Sandbox

Linux is the first implementation target.

When Bubblewrap is available, execution that does not have `network.outbound` must enter a network namespace with no external network access. The sandbox should expose a read-only base system and only explicitly approved writable roots.

If required isolation is unavailable, the runtime fails closed rather than silently running unsandboxed.

The production design must not assume Bubblewrap exists on other operating systems. Platform adapters must provide equivalent guarantees or mark the capability unavailable.

## Terminal and Process Environment

Task-supplied environment variables are untrusted.

The runtime must:

- use a bounded allowlist for ordinary non-secret environment variables;
- reject loader/runtime control variables that can alter executable resolution or inject code;
- never persist raw secret values in a task envelope;
- inject secrets only through opaque secret references resolved inside the local Agent;
- avoid returning injected secret plaintext in tool results or audit events.

## Secret References

A task may name an opaque secret reference only when `secrets.use` is authorized for that exact reference.

The model/Web/Mobile surface should not receive the plaintext secret where injection can occur locally.

A secret resolver is an authority boundary. It must:

- resolve only an already-authorized reference;
- return data only to the local adapter that needs it;
- never serialize plaintext into durable task state;
- redact known injected values from stdout/stderr before remote/audit exposure.

## Network

Network access is a capability, not an incidental side effect of terminal execution.

Without `network.outbound`:

- a tool must not be able to open arbitrary outbound network connections;
- known network commands being absent from an allowlist is not sufficient protection;
- OS/process isolation must enforce the boundary.

With `network.outbound`, destination scope still applies where the adapter can identify the target domain/host.

## Git

Git read operations are separate from Git write operations.

Repository scope must be exact and canonical. Git write does not automatically authorize network push. Push/fetch or any networked Git action also requires current `network.outbound` authority and destination constraints.

Destructive Git operations such as hard reset, clean, force push or branch deletion require elevated operation-specific risk and must not be hidden inside a generic Git write step.

## Process Control

Process control is not arbitrary PID authority.

The Agent should distinguish:

- processes started/owned by the Agent;
- explicitly approved external process targets;
- protected/system processes.

Stopping an unowned or protected process requires an independently authorized high/critical boundary and may remain unavailable in pre-device mode.

## Browser / Screen / Clipboard

These tools are privacy-sensitive.

Browser control, screenshots and clipboard reads must be strictly bounded, auditable and surface-aware. Screen capture and clipboard read have high minimum risk because they may expose unrelated private content.

## Resource Limits

Every adapter must have bounded:

- duration;
- output bytes;
- input size;
- file count;
- recursion depth;
- child process count where applicable.

Resource limits are part of authorization context when a grant specifies a narrower bound.

## Audit

Durable audit records contain stable codes and references, not raw secrets, raw full files, screenshots, browser DOM dumps or arbitrary command output.

Detailed result payloads may exist transiently for the local caller but must follow redaction/disclosure policy before any remote transport.

## Section Boundary

Section 12 owns local tooling and sandbox contracts. It does not own:

- autonomous coding reasoning/work planning — Section 13;
- production real-time routing/control plane — Section 14;
- Web/Mobile command UI — Section 15;
- model-provider routing — Section 18;
- final production penetration/security certification — Section 20.

## Deferred Real-Environment Obligations

Before production closure validate:

- Bubblewrap/user-namespace behavior on supported Linux distributions;
- equivalent sandbox behavior on other supported operating systems;
- symlink and filesystem-race behavior under real concurrent mutation;
- process-tree termination;
- real browser/screen/clipboard permissions;
- real secret-store/keyring integrations;
- DNS/proxy/IPv4/IPv6/network namespace escape testing;
- filesystem mount and device-file exposure;
- resource exhaustion;
- privileged/elevation behavior;
- independent penetration/security review.
