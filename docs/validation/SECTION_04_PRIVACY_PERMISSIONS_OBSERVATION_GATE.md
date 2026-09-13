# Section 04 — Privacy, Permissions and Observation Control Gate

## Status

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

Section 04 enforces the user's observation/privacy intent below AI, personality and presentation layers. Physical OS/sensor behavior remains subject to the recorded Layer 4 deferral. Layers 1–3 and the automation-only portions of Layer 5 are accepted on the exact candidate recorded below.

## Accepted Pre-Device Evidence

Accepted candidate:

`0bfc86e83bdca2bf79ad1ff061709a08889501c4`

Evidence:

- Mobile Core Validation run #192 / ID `34773109075`: **SUCCESS**;
- CodeQL Security Analysis run #85 / ID `34773109004`: **SUCCESS**;
- Mobile/Security/Identity/Privacy regressions: **151/151 PASS**;
- Expo Doctor: **21/21 PASS**;
- Computer Agent Phase 0: **10/10 PASS**;
- dependency audit: **0 Critical / 0 High / 2 reviewed Moderate**;
- full Git-history secret scan: **PASS**.

Detailed evidence:

- `docs/validation/SECTION_04_AUTOMATED_EVIDENCE.md`
- `docs/validation/SECTION_04_DEFECTS.md`

No unresolved Blocker, Critical or High defect is known in the accepted Section 04 pre-device scope.

## Scope

Section 04 implements:

- persistent observation privacy policy;
- `active`, `visual_off`, `ambient_off`, `privacy_lock` policy states;
- runtime `unavailable/unverifiable` handling that fails toward privacy;
- deterministic privacy command transitions;
- explicit reactivation checks;
- live sensor-state registry contracts;
- stale/out-of-order sensor-state rejection;
- truthful structured observation answers derived from runtime state;
- detection of policy-versus-runtime sensor violations;
- passive versus direct-interaction sensor-use distinction;
- camera/microphone/location/presence/health/spatial permission boundaries;
- preservation across restart/model restart/device handoff/room change/new conversation;
- privacy-state persistence outside ordinary resettable app settings;
- privacy-safe audit events;
- deterministic privacy-indicator model for UI surfaces;
- adversarial tests proving no model/background/handoff path silently widens observation authority.

## Non-goals

Pre-device Section 04 does not yet prove:

- real Android camera/microphone/location revocation behavior;
- actual hardware indicator behavior;
- production health/wearable streams;
- AR/VR hardware sensor behavior;
- production Follow Me handoff;
- live emergency override policy;
- smart-home vendor camera/microphone behavior;
- production remote sensor Control Plane.

No emergency override is enabled by default in Section 04.

## Layer 1 — Specification and Static Correctness

Accepted pre-device evidence proves:

- `MUDRIK_OBSERVATION_PRIVACY.md` remains authoritative;
- privacy policy is enforced below AI/model/personality;
- persisted privacy state is not stored in resettable ordinary settings;
- missing/corrupt/unverifiable privacy state fails toward a more private state;
- no ordinary lifecycle event can silently reactivate observation;
- explicit resume cannot silently re-grant OS permission;
- direct user interaction is distinguished from passive observation;
- MUDRIK only claims/control its own sensor use;
- TypeScript/lint/CodeQL pass;
- no new secret/dependency High/Critical regression.

Status: **PASS — PRE-DEVICE**.

## Layer 2 — Unit and Component Verification

Deterministic regression coverage includes:

- `active -> stop_visual -> visual_off`;
- broad privacy command -> `privacy_lock`;
- ordinary conversation does not unlock `privacy_lock`;
- restart/model restart/handoff/room change/new conversation preserve restrictive policy;
- visual resume from `visual_off` requires explicit user intent plus permission/device/runtime checks;
- broad unlock requires explicit user intent plus checks;
- denied/unknown OS permission never becomes granted in policy;
- untrusted/unknown device never activates a sensor;
- passive camera blocked in `visual_off`;
- all passive observation blocked in `ambient_off/privacy_lock`;
- explicit direct interaction does not itself re-enable passive observation;
- unavailable runtime blocks activation;
- sensor registry rejects stale/out-of-order transitions;
- duplicate sequence with conflicting state is rejected;
- truthful status is built from fresh registry state;
- empty/stale/unknown registry is `unverifiable`, not falsely "off";
- active sensor conflicting with privacy policy is reported as a policy violation;
- privacy persistence survives ordinary settings reset;
- malformed persisted state fails closed;
- privacy audit accepts only a strict scalar metadata surface;
- privacy indicators expose active/unverifiable/policy-violation status without inventing sensor truth.

Status: **PASS — PRE-DEVICE**.

## Layer 3 — Integration, Security and Adversarial Verification

Adversarial coverage includes:

- model/tool attempts to reactivate without explicit user request;
- background/lifecycle paths cannot reopen passive authority;
- device handoff while privacy lock is active;
- OS permission/trust mismatch represented as violation/deny;
- registry event arrives out of order;
- forged sensor state uses same sequence with different data;
- runtime registry becomes stale/unavailable;
- app/settings reset attempts to erase privacy lock;
- direct microphone interaction while broad passive monitoring is off;
- active camera discovered while `visual_off/privacy_lock` is set;
- unknown/malformed sensor state input;
- malformed timestamps/IDs and nested reactivation input;
- privacy command persistence succeeds but sensor stop fails;
- persistence failure while broadening denies the broadening;
- restart after a stop command re-enforces restrictive sensor shutdown;
- audit attempts to smuggle raw sensor payload fields are rejected.

Any uncertainty or enforcement failure preserves restrictive policy and surfaces an explicit non-success state.

Status: **PASS — PRE-DEVICE**.

## Layer 4 — Real Device / Sensor / OS Verification

**DEFERRED** under the owner-directed physical-validation exception.

Before final closure verify at minimum:

- Android camera permission allow/deny/revoke;
- Android microphone permission allow/deny/revoke;
- location permission behavior if location enters the runtime scope;
- app background/foreground/restart/reboot persistence;
- OS process death;
- real camera/microphone start/stop confirmation;
- visible privacy indicators where supported;
- direct-interaction behavior while passive monitoring is locked;
- handoff behavior on every actually supported second surface;
- wearable/health streams where supported;
- platform settings changes while app is running;
- network loss while remote observation integration is active;
- app upgrade/migration preserving restrictive privacy policy;
- emergency override behavior only if the user explicitly configures such a feature later.

Mock-only evidence cannot close sensor shutdown, OS permission, hardware indicator or handoff obligations.

Status: **OPEN / DEFERRED**.

## Layer 5 — Release / Independent Review / Evidence

Automation-only pre-device requirements are complete:

- exact candidate SHA recorded;
- Mobile Core Validation green;
- CodeQL green;
- Section 04 regression/adversarial tests green;
- no unresolved Critical/High defect in pre-device scope;
- persistence/migration evidence recorded;
- policy-versus-runtime violation handling reviewed;
- privacy audit/redaction reviewed;
- deferred Layer 4 limitations recorded.

Before final production closure:

- Layer 4 passes;
- independent privacy/security review covers sensor authority and reactivation paths;
- production sensor adapters prove stop/deny behavior;
- final candidate is revalidated after real-device fixes.

Status: **PRE-DEVICE PASS / FINAL RELEASE OPEN**.

## Core Acceptance Rule

A MUDRIK-controlled passive sensor may be active only when the persisted privacy policy permits it **and** current runtime evidence proves the relevant OS permission, device trust and sensor-control state are valid.

A user stop/privacy command immediately removes future passive observation authority and remains effective until an explicit permitted reactivation. Restart, model state, device handoff, room change, background work or new conversation cannot silently restore that authority.
