# Section 19 — Automated Evidence

## Acceptance State

PRE-DEVICE COMPLETE — OPEN / REAL-INTEGRATION LAYER 4 DEFERRED

This evidence covers deterministic and automated pre-device obligations for Section 19 only. It does not claim production vendor integrations, real smart-home hardware, credential-vault lifecycle, real cloud/local-hub failure behavior, physical high-risk approval UX or independent security/privacy review.

## Candidate

- Branch: mudrik-core-v1
- Implementation candidate: 15193f2592d6210a9414c90dab9cc9a7f2574c68
- Candidate message: Build Section 19 integrations and automation core

## Local Evidence

On the connected Pop!_OS development machine, the candidate passed:

- frozen Yarn dependency install: PASS
- dependency blocking audit: 0 Critical / 0 High / 5 reviewed Moderate
- TypeScript: PASS
- ESLint: PASS
- Section 19 integrations/automation suite: 37/37 PASS
- whole Mobile Core regressions: 958/958 PASS
- Expo Doctor 1.20.4: 21/21 PASS
- Computer Agent regressions: 184/184 PASS
- Control Plane regressions: 59/59 PASS
- git diff --check: PASS

## Hosted Validation

### Mobile Core Validation

- Workflow: Mobile Core Validation
- Run number: 785
- Run ID: 36899671966
- Head SHA: 15193f2592d6210a9414c90dab9cc9a7f2574c68
- Result: SUCCESS

### CodeQL

- Workflow: CodeQL Security Analysis
- Run number: 681
- Run ID: 36899671945
- Head SHA: 15193f2592d6210a9414c90dab9cc9a7f2574c68
- Result: SUCCESS

## Implemented Controls

The candidate provides:

- strict integration adapter registration and public projection separation;
- adapter-private credential references;
- bounded vendor discovery records with zero authority;
- explicit discovery-to-admission binding;
- exact admitted capability subsets;
- dedicated `home.device.read`, `home.access.control` and `home.security.control` core capabilities;
- account/workspace/version-bound integration policy;
- exact command schema and per-capability value validation;
- low/medium/high/critical integration risk classification;
- instant-command risk ceilings;
- explicit approval for high-risk access/security/privacy actions;
- specialized-policy routing for commerce/purchase;
- approval provenance stored by the registry and bound to command identity;
- direct rejection of approval-shaped objects lacking registry provenance;
- exact binding revision/device identity checks;
- binding revocation independent of vendor discovery availability;
- exact-target routine definitions with no wildcard targets;
- cross-device routines requiring each exact binding/device/revision;
- routine and automation monotonic revisions;
- automation capability allowlist and frequency/time bounds;
- paused/revoked automation enforcement;
- short-lived automation execution objects bound to exact trigger/policy/routine revisions;
- exact automation action-index binding;
- automation action replay conflict prevention;
- background capability-grant requirement for automated commands;
- trigger replay idempotency and conflict rejection;
- per-automation revision rate limiting;
- policy/binding/routine revocation invalidation;
- credential-free adapter invocation envelopes;
- invocation replay idempotency and command replay conflict detection;
- adapter results accepted only against an issued matching invocation;
- result replay idempotency and result-conflict detection;
- content/credential-minimized audit contracts;
- zero execution/sensor/approval/capability authority on discovery, policy, command, routine, automation, invocation, result and audit surfaces;
- preservation of Sections 11/12 as the final execution/capability authority.

## Adversarial Evidence Highlights

Regression coverage proves at minimum:

- unknown fields and malformed IDs fail closed;
- public adapter projections contain no credential reference;
- discovery cannot manufacture unknown capability IDs;
- a binding cannot admit capabilities absent from discovery mapping;
- vendor discovery alone cannot resolve adapter credentials;
- stale/unavailable adapters remove credential access;
- instant unlock/open/security actions cannot be downgraded to low-risk execution;
- approvals cannot be replayed across command/binding/capability identity;
- revoked or stale bindings invalidate commands;
- policy scope and admitted capability scope are both required;
- automation requires explicit automation policy plus background capability grant;
- automation without issued execution proof fails closed;
- commerce purchase cannot use generic integration authorization;
- future timestamps fail against trusted time;
- routine wildcard targets are structurally invalid;
- missing cross-device targets fail closed;
- high-risk actions are forbidden from unattended automation;
- exact trigger replay returns the same execution while conflicting replay fails;
- hourly automation limits are enforced;
- pause/revoke revisions are non-executable;
- binding/routine/policy changes invalidate stale automation execution;
- automation execution action index and semantic value must match exactly;
- the same automation action cannot be claimed under another command ID;
- adapter invocation carries no credential material;
- result identity must match an issued invocation;
- hidden vendor payloads and authority escalation fields are rejected from result/audit contracts.

## Deferred Layer 4

Before production closure validate at minimum:

- real smart-home/cloud/local-hub adapters;
- real device discovery/add/remove/replacement churn;
- production credential vault, rotation and revocation;
- vendor token expiry and reauthentication;
- local-network and cloud outages;
- vendor rate limits/timeouts;
- high-risk approval UX on real devices;
- routine partial failure and compensation/recovery;
- durable automation scheduler persistence/restart;
- cross-device timing and partial availability;
- physical access/security device behavior;
- camera/microphone privacy flows;
- provider privacy/data-residency review;
- independent security review.

## Acceptance Rule

Section 19 is accepted at the pre-device level on the exact candidate SHA above. Production closure remains deferred to Layer 4 and Section 20.
