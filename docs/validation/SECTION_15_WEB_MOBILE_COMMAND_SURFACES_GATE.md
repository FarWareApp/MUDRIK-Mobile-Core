# Section 15 — Web and Mobile Command Surfaces Gate

## Status

`PRE-DEVICE IMPLEMENTATION — ACTIVE`

Section 15 builds Web/Mobile control surfaces on top of the accepted Section 14 Control Plane. A UI surface may express intent, display authoritative state and submit bounded actions. It never becomes execution authority.

## Authoritative Architecture

- `docs/architecture/MUDRIK_COMPUTER_AUTONOMY.md`
- `docs/architecture/MUDRIK_REALTIME_CONTROL_PLANE.md`
- `docs/architecture/MUDRIK_CONTROL_PLANE_THREAT_MODEL.md`
- `docs/architecture/MUDRIK_UI_UX_DETAIL_REGISTRY.md`
- `docs/architecture/MUDRIK_20_SECTION_EXECUTION_PLAN.md`
- `docs/validation/SECTION_03_IDENTITY_AUTH_DEVICE_TRUST_GATE.md`
- `docs/validation/SECTION_11_DURABLE_COMPUTER_AGENT_GATE.md`
- `docs/validation/SECTION_12_COMPUTER_AGENT_TOOLING_SANDBOX_GATE.md`
- `docs/validation/SECTION_14_CONTROL_PLANE_ROUTING_GATE.md`

Target boundary:

`Authenticated Surface Session -> Bounded UI Intent -> Section 14 Route/Approval API -> Authoritative Task State -> Read-Only Surface Projection`

Local execution remains:

`Section 14 Routed Task -> Section 11 Admission -> Section 12 Capability/Sandbox -> OS`

## Scope

- paired-device status and selection;
- bounded task composer;
- task lifecycle/progress projection;
- approval request presentation and bounded decisions;
- Stop/Pause/Resume intent;
- result/diff/history projection;
- Web and Mobile parity where appropriate;
- reconnect/offline/uncertainty presentation;
- accessibility, RTL/LTR and UI detail preservation;
- shared control-surface contracts independent of concrete transport.

## Explicit Non-Goals

- no direct browser-to-OS execution;
- no raw public Computer Agent socket;
- no client-created capability grants;
- no client-supplied approval truth;
- no plaintext long-lived pairing secrets in Web/Mobile state;
- no arbitrary shell semantics hidden in UI labels/prose;
- no production WSS/API deployment yet;
- no Section 16 memory semantics;
- no Section 18 provider authority.

## Core Invariants

1. UI state never grants capability or approval authority.
2. Every remote command remains bound to authenticated Section 14 account/session/device identity.
3. Selected device/presence status is advisory and never authentication.
4. Cross-account/cross-device references fail closed.
5. Surface task/action contracts are strict, versioned and bounded.
6. Unknown action kinds/fields fail closed.
7. Task composer cannot smuggle capability grants or approval booleans.
8. Risk/capability/scope displayed to the user comes from validated server/control state, not free-form model text.
9. Approval decisions bind exact approval/task/device/revision identity.
10. A UI approval cannot be reused for another task or scope.
11. Stop/Pause/Resume actions are exact-task/revision intents; stale conflicting controls fail closed.
12. Terminal task state never regresses from stale/out-of-order UI events.
13. Delivery/presence/offline states remain distinct from execution state.
14. Reconnect/resume cannot manufacture a new logical task.
15. Result/diff/history payloads are bounded and disclosure-safe.
16. Raw secrets and plaintext secret values never enter surface projections.
17. Secret references are not rendered as secret values.
18. Arbitrary tool/terminal output is untrusted display data and cannot become UI authority.
19. Rendered markdown/content cannot invoke commands.
20. Browser Web surface cannot access local filesystem/process/system capabilities directly.
21. Mobile/Web command parity uses shared intent contracts rather than divergent authority rules.
22. Surface-specific adapters cannot widen Section 14/11/12 policy.
23. Pending/blocked/uncertain states are explicit; no hidden background progress.
24. Approval UX clearly states device, action/capabilities, scope, risk, expiry/mode when present.
25. Stop action remains immediately reachable while a cancellable task is active.
26. Offline/reconnect projections are deterministic and do not falsely claim success.
27. Device/task/history lists are bounded and stable under duplicate/reordered updates.
28. Accessibility semantics and minimum touch-target requirements remain explicit.
29. RTL/LTR layout does not change action meaning or identity binding.
30. Same validated surface state plus same ordered input yields deterministic projection.

## Layer 1 — Specification / Static Correctness

Required:

- exact shared device/task/approval/action/result projection contracts;
- explicit non-authority fields on surface intents/projections;
- deterministic state reducer/projection rules;
- strict task composer bounds;
- exact Stop/Pause/Resume identity/revision binding;
- bounded result/diff/history models;
- localization/accessibility state contracts;
- no direct OS/browser privilege adapter in the surface layer;
- lint/typecheck/secret/dependency gates green.

## Layer 2 — Unit / Component Verification

Mandatory cases include:

- valid paired-device projection;
- cross-account device projection rejection;
- online presence never implies execution authority;
- valid/invalid task composer parsing;
- hidden authority fields rejected;
- stale progress cannot regress state;
- terminal state cannot regress;
- exact approval binding;
- forged approval boolean rejected;
- stale approval revision rejected;
- Stop/Pause/Resume exact-task binding;
- result/diff truncation and bounds;
- secret-like private fields rejected/redacted;
- duplicate/reordered update behavior;
- RTL/LTR action identity consistency.

## Layer 3 — Integration / Security / Adversarial Verification

Mandatory cases include:

- Web/Mobile action maps to Section 14 intent only;
- server-routed task still rejected by local Agent when local authority is absent;
- compromised-surface attempt to manufacture capability/approval fails;
- cross-account/cross-device ID manipulation fails;
- stale browser tab action fails safely;
- reconnect after missed progress reconstructs current state without duplicate execution;
- cancel racing terminal completion has deterministic display;
- offline device cannot be presented as successfully executing;
- malicious task/output prose cannot invoke an action;
- oversized result/diff/history fails or truncates safely;
- private/secret payload injection cannot enter surface projection;
- slow/reordered event stream remains bounded and monotonic;
- accessibility/control semantics remain correct for destructive/approval actions.

## Layer 4 — Real Surface / Device Verification

**DEFERRED** under the owner-directed real-environment exception.

Before production closure validate at minimum:

- real authenticated Web sessions/WebAuthn where supported;
- real WSS/API transport to Section 14;
- desktop browser matrix;
- Android/iOS physical remote-control flows;
- mobile notifications/deep links for approvals;
- actual cross-device approval synchronization;
- reconnect/offline/network-switch behavior;
- keyboard/safe-area/screen-size behavior;
- RTL/LTR on physical devices/browsers;
- screen reader and keyboard navigation;
- real latency/progress perception;
- stale-tab/multi-tab behavior;
- production CSP/CSRF/cookie/session protections;
- independent Web/mobile security review.

## Layer 5 — Evidence / Release Gate

Pre-device completion requires:

- exact accepted candidate SHA;
- Section 15 contract/component/adversarial tests green;
- Control Plane regressions green;
- Computer Agent regressions green;
- Mobile Core regressions green;
- hosted Mobile Core Validation green;
- CodeQL green;
- dependency/secret gates green;
- no unresolved Blocker/Critical/High Section 15 defect;
- automated evidence and defect record;
- all real-surface obligations explicitly deferred.

## Acceptance Rule

Section 15 is pre-device complete only when Web/Mobile surfaces can safely express task/control/approval intent and display authoritative state without gaining execution authority. Section 14 remains routing truth and Sections 11/12 remain the final local execution authority.
