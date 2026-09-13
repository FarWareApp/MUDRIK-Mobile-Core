# Section 07 — Cross-Device Presence and Handoff Gate

## Status

`PRE-DEVICE IMPLEMENTATION — ACTIVE`

Section 07 establishes a deterministic, privacy-aware cross-device presence layer for the one logical MUDRIK companion session. It selects and hands presentation between already-authorized surfaces; it does not pair devices, grant device trust, grant sensor access, broaden privacy state, or grant execution/memory/disclosure authority.

## Authoritative Architecture

- `docs/architecture/MUDRIK_SMART_COMPANION.md`
- `docs/architecture/MUDRIK_20_SECTION_EXECUTION_PLAN.md`
- Section 03 device trust remains authoritative for whether a device is trusted.
- Section 04 observation privacy remains authoritative for sensor/observation state.
- Section 06 companion profile remains authoritative for companion identity/personality.

Target flow:

`Companion Session -> Presence Registry -> Presence Resolver -> Handoff Policy -> Authorized Surface Renderer`

## Scope

- trusted-surface contract bound to an existing Section 03 device identity;
- explicit surface privacy classification:
  - `personal_private`;
  - `personal_shared_space`;
  - `household_shared`;
  - `public_or_untrusted`;
- renderer capability declaration without capability authority;
- monotonic presence observations and stale/conflicting update rejection;
- bounded presence-confidence evidence;
- one-primary-surface arbitration per logical companion session;
- explicit user pinning;
- optional Follow Me policy;
- deterministic surface scoring and stable tie-breaking;
- content-sensitivity/privacy checks before text/audio/avatar presentation;
- handoff generation/lease semantics that prevent replay and split-brain ownership;
- privacy-state preservation across handoff;
- state-preservation manifest for session/profile/task/context references without permission inheritance;
- reconnect reconciliation;
- provider/hardware-neutral contracts for future mobile/web/display/headset/AR/VR adapters.

## Explicit Non-Goals

- no new device pairing or trust establishment; Section 03 owns device trust;
- no real UWB/Bluetooth/Wi-Fi/room-sensor adapters in the pre-device gate;
- no raw presence sensor ingestion into cloud services;
- no media/device orchestration; Section 08 owns that;
- no device-finding precision; Section 09 owns that;
- no production control-plane routing; Section 14 owns that;
- no production AI/provider integration; Section 18 owns that;
- no smart-home presence execution; Section 19 owns that;
- no production AR/VR renderer;
- no permission inheritance from source surface to destination surface.

## Core Security / Privacy Invariants

1. A surface cannot become eligible merely because it is nearby or active.
2. Device trust must be proven independently; network proximity is never trust.
3. `public_or_untrusted` is never eligible for private/sensitive content.
4. Shared surfaces never receive sensitive text/audio merely because Follow Me is enabled.
5. Low/ambiguous presence confidence cannot silently disclose private content.
6. Explicit pinning cannot override device trust, privacy classification, capability compatibility or Section 04 privacy restrictions.
7. Follow Me is opt-in and independently configurable from companion initiative.
8. Exactly one surface may own interactive microphone/spoken-output turn-taking for a logical session generation.
9. Handoff preserves privacy restrictions exactly; it can never turn `visual_off`, `ambient_off` or `privacy_lock` into `active`.
10. Handoff carries references/state only; it grants zero tool/sensor/memory/disclosure authority.
11. Stale/replayed/conflicting presence or handoff messages fail closed.
12. Reconnect reconciliation must prevent two surfaces from both believing they are primary.
13. Unknown fields, hidden credentials, non-finite confidence values and malformed identifiers fail closed.
14. Raw sensor streams are not part of the presence contract.

## Layer 1 — Specification / Static Correctness

Required PASS evidence:

- contracts reuse Section 03 `device` identity validation instead of inventing parallel device trust;
- strict surface/session/observation identifiers;
- exact-key parsers for untrusted runtime inputs;
- explicit privacy/content classification;
- renderer capabilities are presentation metadata only;
- one-primary invariant is represented in the data model;
- privacy-state preservation is explicit;
- no provider API keys/tokens/raw sensor payloads in contracts;
- lint, TypeScript, CodeQL, dependency and secret gates green.

## Layer 2 — Unit / Component Verification

Mandatory deterministic cases:

- valid surface descriptor accepted;
- malformed/unknown fields rejected;
- duplicate capabilities normalized/rejected deterministically;
- stale observation rejected;
- exact duplicate observation idempotent;
- same-sequence conflicting observation rejected;
- confidence bounds enforced and `NaN`/infinity rejected;
- offline/unavailable surface removed from candidacy;
- revoked/untrusted device never eligible;
- explicit pin wins among otherwise eligible candidates;
- invalid pin does not force unsafe surface;
- deterministic ranking and tie-breaking;
- Follow Me disabled prevents automatic movement;
- direct/manual handoff remains independently evaluable;
- private/sensitive content prefers personal-private surface;
- shared/public surfaces suppress prohibited presentation modes;
- only one primary ownership lease accepted per generation;
- expired lease cannot retain ownership;
- higher handoff generation supersedes older generation;
- same-generation conflicting owner fails closed.

## Layer 3 — Integration / Security / Adversarial Verification

Mandatory adversarial cases:

- cloned/spoofed surface using wrong Section 03 device identity;
- presence signal claiming nearby while device trust is absent/revoked;
- trust/privacy classification downgrade or hidden-field injection;
- forged `personal_private` claim from an untrusted device;
- explicit pin to revoked/public surface;
- two simultaneous primary claims;
- delayed pre-handoff packet trying to reclaim ownership;
- reconnect after network partition with competing owners;
- privacy-lock downgrade attempt during handoff;
- sensitive content routed to shared television/speaker;
- low-confidence presence attempting automatic private disclosure;
- renderer capability mismatch;
- future/expired timestamps and oversized sequences;
- credential/token/raw-sensor shaped payload injection;
- source surface attempting to pass inherited tool/sensor/memory permissions;
- deterministic behavior under input reordering.

Any ambiguity must resolve toward no automatic handoff and no private disclosure.

## Layer 4 — Physical / Real-Environment Verification

**DEFERRED** under the recorded owner-directed physical-validation exception.

Before final closure, verify where supported:

- real phone <-> web/display handoff;
- at least two trusted physical devices;
- explicit pin/unpin;
- Follow Me enable/disable;
- Wi-Fi/cellular/offline/reconnect transitions;
- source app background/process death during handoff;
- destination offline mid-handoff;
- real device revoke while active;
- no double audio/microphone ownership;
- private content suppression on shared surface;
- Section 04 privacy state preserved on real destination;
- headset/Bluetooth behavior where in release scope;
- AR/VR/spatial adapters only where actual supported hardware exists;
- latency, battery and recovery behavior;
- accessibility and visible handoff status.

## Layer 5 — Evidence / Release Gate

Pre-device completion requires:

- exact candidate SHA;
- Mobile Core Validation green;
- CodeQL green;
- Section 07 plus whole-core regressions green;
- zero unresolved Critical/High Section 07 defects;
- dependency and secret gates green;
- defect/evidence records;
- Layer 4 obligations remain explicit.

Production/final Section 07 closure requires Layer 4 and exact-candidate revalidation.

## Core Acceptance Rule

Cross-device presence decides **where an already-authorized companion presentation may appear**. It never decides **what the user is authorized to disclose, sense, remember or execute**. Destination surfaces receive no authority merely because a session moves to them.
