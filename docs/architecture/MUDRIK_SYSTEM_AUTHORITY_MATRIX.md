# MUDRIK System Authority Matrix

## Purpose

This matrix is the Section 20 composition contract. It records which subsystems may describe, route or propose work and which boundaries may actually authorize side effects.

No row gains authority by being combined with another non-authoritative row.

| Subsystem | May describe/propose | May issue approval | May issue capability grant | May execute side effect |
| --- | --- | --- | --- | --- |
| Mobile/Web UI | yes | no | no | no |
| Voice runtime | yes | no | no | no |
| Companion/personality | yes | no | no | no |
| Presence/handoff | yes | no | no | no |
| Memory | contextual only | no | no | no |
| Knowledge | contextual only | no | no | no |
| Intelligence Router/model output | infer/route only | no | no | no |
| Control Plane routing | route/deliver | only durable approval registry for explicitly bound flows | no | no local execution |
| Integration discovery/state | describe only | no | no | no |
| Integration aliases/rooms | resolve metadata only | no | no | no |
| Integration automation trigger | trigger candidate only | no | no | no |
| Section 19 integration registry | authorize only through bound policy/approval/capability proof | issued provenance for its approval boundary only | no | adapter invocation only after authorization |
| Core capability policy | no | no | yes, from trusted grants only | no |
| Computer Agent Sections 11/12 | no | consumes approvals/grants | consumes grants | final local computer execution authority |
## Authority Artifacts

Trusted authority artifacts are intentionally narrow:

- authenticated account/device/session identities;
- durable, provenance-bound approvals from their owning registry;
- current capability grants validated by the core capability policy;
- current Section 19 integration policy plus exact binding/revision;
- short-lived automation execution proof for unattended integration actions;
- Section 11/12 task/capability state for local computer execution.

A structurally similar object from another subsystem is not interchangeable with one of these artifacts.

## Explicitly Non-Authoritative Artifacts

The following remain untrusted data even when validly parsed:

- model or provider result envelopes;
- memory records, candidates and retrieval projections;
- knowledge chunks, citations and projections;
- companion state;
- voice transcripts;
- vendor discovery and vendor result payloads;
- aliases and room projections;
- UI task/approval presentation;
- audit records;
- result envelopes.

No parser or composition path may reinterpret these as a grant or approval.
## Composition Rule

A side effect is permitted only when the final authoritative boundary independently validates every artifact it requires against current trusted time, identity/account/workspace binding, revision, revocation state and capability scope.

If any context subsystem is missing, stale or unavailable, the system may lose context or functionality but must not synthesize replacement authority.

If any execution/provider/integration boundary is unavailable, the side effect fails closed.

## Release Rule

This matrix is a static architecture requirement, not proof of production certification. Production release remains prohibited while any mandatory Section 01–19 Layer 4 obligation is deferred/open or while Section 20 certification evidence is incomplete.
