# Section 08 — Automated Evidence

## Acceptance State

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

This evidence closes the automated/pre-device obligations for Section 08 only. It does not claim that real TV/computer/console/media adapters, physical network recovery, platform restrictions, battery behavior or physical shared-screen privacy have passed Layer 4.

## Accepted Implementation Candidate

- Commit: `b40b643a1b7f5856f8d727c471269f1829f0bfc1`
- Branch: `mudrik-core-v1`

## Validation Evidence

### Mobile Core Validation

- Workflow: `Mobile Core Validation`
- Run number: `#673`
- Run ID: `36054482695`
- Head SHA: `b40b643a1b7f5856f8d727c471269f1829f0bfc1`
- Result: **SUCCESS**

Validated gates include frozen dependency install, reproducibility, Android build configuration, tracked-sensitive-file scan, full Git-history secret scan, High/Critical dependency gate, lint, TypeScript, Mobile Core regressions, Expo Doctor and Computer Agent Phase 0.

Automated counts on the accepted candidate:

- Mobile Core regressions: **591/591 PASS**;
- Expo Doctor: **21/21 PASS**;
- Computer Agent Phase 0: **10/10 PASS**.

### CodeQL

- Workflow: `CodeQL Security Analysis`
- Run number: `#568`
- Run ID: `36054482697`
- Head SHA: `b40b643a1b7f5856f8d727c471269f1829f0bfc1`
- Result: **SUCCESS**
- JavaScript/TypeScript analysis: PASS.

## Implemented Section 08 Controls

The accepted candidate includes:

- strict normalized device/media intent discriminators with exact-key parsing;
- one deterministic least-privilege capability mapping per supported intent;
- existing Section 03 device identity reuse rather than a parallel trust model;
- provider-neutral adapter descriptors with bounded revisions, timestamps and TTL;
- adapter support metadata that never grants authority;
- trusted-evaluation-time checks for adapters, ambient context and media sessions;
- current trust re-check before execution, including post-resolution revocation;

- Section 02 capability authorization independently required before device/media execution;
- explicit target mismatch rejection and no unsafe fallback for an ineligible explicit device;
- deterministic contextual target ranking with clarification on materially tied candidates;
- exact intent sequencing, duplicate idempotence, sequence-gap rejection and replay protection;
- bounded volume/seek/reference fields with NaN, infinity and unsafe-integer rejection;
- credential-, URL-, script- and raw-command-shaped reference/search payload rejection;
- dedicated dual-device media-transfer policy with independent source and target grants;
- media-session transfer manifests that carry references only and inherit zero authority;
- transfer revision/generation replay protection and generation-exhaustion handling;
- ephemeral ambient context with TTL bounds, zero memory authority and zero emotion assertion;
- deterministic contextual content ordering that blocks purchase/account-changing automatic actions;
- strict display layout metadata with no screen-capture/vision authority;
- deterministic companion placement that avoids reserved regions;
- Reduced Motion suppression of animated automatic repositioning;
- Section 07 presentation authorization preserved by display privacy checks;
- private/sensitive content suppression on insufficiently private surfaces;
- private-audio capability requirement on shared-space audio;
- typed/sanitized adapter errors without raw credential leakage;
- no shell execution, executable path, unrestricted URL, installer, purchase or account-change authority in Section 08.

## Adversarial Evidence Highlights

Regression coverage proves at minimum:

- hidden `permissions`, authority, token and command fields fail closed;
- malformed device identities and duplicate adapter capabilities are rejected;
- raw bash/PowerShell/cmd and common direct command forms cannot traverse `content.search`;
- arbitrary URL/URI and credential-shaped opaque references are rejected;
- revoked, unavailable, stale, future and unsupported target candidates are ineligible;
- target trust revocation after resolution blocks execution;
- adapter support cannot substitute for an actual capability grant;
- stale/revoked/wrong capability grants fail closed;
- candidate input reordering does not alter deterministic selection;
- ambiguous target/content choices produce clarification rather than side effects;
- purchases/account changes remain blocked from contextual auto-selection;
- stale media revision/transfer generation cannot replay a transfer;
- source/target mismatch, same-device transfer and stopped/unknown media fail closed;
- source and target media-transfer grants are checked independently;
- ambient context cannot become inferred emotion or long-term memory authority;
- malformed layout metadata cannot grant screen capture or escape viewport constraints;
- shared/public surfaces cannot widen Section 07 presentation authority;
- sensitive/private disclosure is suppressed where privacy class/capability is insufficient;
- adapter errors collapse to bounded sanitized diagnostics.

## Closed Defects

See `docs/validation/SECTION_08_DEFECTS.md`.

No known unresolved Critical or High Section 08 defect remains in the automated/pre-device scope at the accepted implementation candidate.

## Deferred Layer 4 Evidence

Still mandatory before final Section 08 production closure:

- real phone/TV/computer/display media controls;
- supported application open/close behavior on physical platforms;
- real pause/resume/seek/volume and channel behavior;
- media transfer/resume between at least two supported physical devices;
- real network loss/reconnect and adapter-unavailable recovery;
- real shared-screen private-content suppression;
- companion placement over representative video/subtitle/menu/game layouts;
- Reduced Motion behavior on device;
- platform restrictions for consoles, TVs and streaming devices;
- latency, battery and recovery behavior;
- accessibility and visible execution/status feedback.

## Acceptance Rule

Section 08 is accepted only at the pre-device level. It may decide **which already-authorized device/media operation best matches the request and where it should route**; context, AI output, proximity and adapter support never become permission.
