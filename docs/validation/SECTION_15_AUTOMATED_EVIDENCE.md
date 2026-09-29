# Section 15 — Automated Evidence

## Acceptance State

PRE-DEVICE COMPLETE — OPEN / REAL-SURFACE LAYER 4 DEFERRED

This evidence closes the deterministic and automated pre-device obligations for Section 15 only. It does not claim production Web sessions, production WSS/API transport, physical Android/iOS remote-control validation, production browser security headers/cookies, or independent Web/mobile penetration testing.

## Accepted Candidate

- Branch: mudrik-core-v1
- Accepted commit: a7aa9931c438eae93beea2ceaccdca299b8ad79c
- Accepted message: Add adversarial command surface gateway

Accepted implementation chain:

- 7af56aa — Add command surface authority boundaries
- 4db12e8 — Add bounded command surface content contracts
- f69cb35 — Bind command actions to surface sessions
- 251d926 — Add bounded command surface state reducer
- 325ecf2 — Add command surface control semantics
- 3d48ae7 — Add safe command history and approval presentation
- a7aa993 — Add adversarial command surface gateway

## Local Automated Evidence

On the connected Pop!_OS development machine, the exact candidate passed:

- TypeScript: PASS
- ESLint: PASS
- Mobile Core regressions: 842/842 PASS
- Control Plane regressions: 59/59 PASS
- Computer Agent regressions: 184/184 PASS
- Expo Doctor: 21/21 PASS
- git diff --check: PASS
- worktree secret-signature gate: PASS
- dependency audit: 0 Critical / 0 High / 5 Moderate

The dependency acceptance gate blocks High/Critical findings. Moderate findings remain tracked and are not represented as zero-risk or silently suppressed.

## Implemented Section 15 Controls

The accepted candidate provides:

- strict Web/Mobile shared command-surface identifiers and capability vocabulary;
- account/device/task/approval-bound read-only projections;
- bounded non-authoritative task composer intent;
- exact revision-bound Pause/Resume/Cancel intents;
- exact approval/task/device/revision-bound approval decisions;
- result/diff projection with relative-path, size, cardinality and secret-disclosure constraints;
- bounded deterministic history projection;
- authenticated surface-session contracts with explicit Web/Mobile surface identity;
- per-session monotonic action sequencing;
- stale-tab, replay, sequence-gap and same-sequence-conflict rejection;
- cross-account, cross-device, cross-session and cross-surface fail-closed checks;
- deterministic bounded surface state for devices, tasks, approvals and results;
- task terminal-state non-regression and same-revision conflict rejection;
- approval consumed/revoked non-reactivation;
- exact result-to-terminal-task revision/outcome binding;
- connectivity/offline/reconnect state separated from execution truth;
- last-known uncertainty for active tasks while offline;
- bounded device/task/approval/result collections with no silent eviction;
- RTL/LTR-independent action identity and semantics;
- explicit destructive/approval/rejection control metadata;
- minimum 48 dp touch target and keyboard/screen-reader control semantics;
- immediately reachable Stop semantics for cancellable active tasks;
- approval presentation containing device, capability, scope, risk, mode and expiry;
- secret-safe approval scope, device labels, history, results and diff text;
- a transport-neutral Surface Gateway that emits Section 14 routing intent only;
- explicit grantsAuthority=false, performsExecution=false and createsCapabilityGrant=false at the surface gateway boundary;
- identical Web/Mobile authority rules through shared contracts.

## Adversarial Evidence Highlights

Regression coverage proves at minimum:

- hidden authority fields are rejected;
- capability-grant or approval truth cannot be smuggled through the task composer or control intent;
- malicious JSON/prose rendered as task text remains inert and cannot invoke an action;
- display text alone cannot create a Stop/Pause/Resume action;
- stale browser-tab actions fail on session revision or sequence;
- exact action replay is idempotent while changed same-sequence payload conflicts;
- cross-account/source-device/surface-instance/surface-type manipulation fails closed;
- Web and Mobile route through the same non-authoritative request contract;
- stale/reordered task updates cannot regress task truth;
- a terminal cancel cannot be overwritten by a late success projection;
- offline/reconnecting state does not fabricate execution success;
- result projection requires the exact terminal task revision and matching outcome;
- duplicate/reordered history and state updates remain deterministic;
- oversized history/result/diff collections fail or truncate according to contract;
- secret-like values and opaque secret references cannot enter surface disclosure fields;
- RTL/LTR changes presentation direction only, never action identity or target binding.

## Closed Defects

See docs/validation/SECTION_15_DEFECTS.md.

No known unresolved Blocker, Critical or High Section 15 defect remains in the automated/pre-device scope at the accepted candidate.

## Deferred Layer 4 / Production Obligations

Before production closure Section 15 still requires:

- real authenticated Web sessions and WebAuthn where supported;
- production WSS/API transport to Section 14;
- desktop browser compatibility matrix;
- physical Android/iOS remote-control flows;
- real mobile notifications and approval deep links;
- actual cross-device approval synchronization;
- reconnect/offline/network-switch behavior on real clients;
- keyboard, safe-area and screen-size validation;
- real RTL/LTR rendering across supported devices/browsers;
- screen reader and keyboard navigation validation;
- measured real latency/progress perception;
- stale-tab and multi-tab behavior in real browsers;
- production CSP, CSRF, cookie and session protections;
- independent Web/mobile security and penetration review.

## Acceptance Rule

Section 15 is accepted only at the pre-device level. Web/Mobile surfaces may express bounded intent and display validated Section 14 state; they do not acquire execution authority. Section 14 remains routing truth and Sections 11/12 remain the final local execution authority. Section 20 must validate every deferred real-surface obligation before production release.
