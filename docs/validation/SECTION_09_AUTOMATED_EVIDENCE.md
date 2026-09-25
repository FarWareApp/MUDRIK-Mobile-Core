# Section 09 — Automated Evidence

## Acceptance State

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

This evidence closes the automated/pre-device obligations for Section 09 only. It does not claim that real Bluetooth/UWB/Wi-Fi locating, physical ring/vibrate/flash/wake, offline/dead-battery behavior, camera/AR guidance, physical shared-display privacy, battery, latency or accessibility have passed Layer 4.

## Accepted Implementation Candidate

- Commit: `936cb35ee4a9e79fa84a9edddb1313fccdd85dd2`
- Branch: `mudrik-core-v1`

## Validation Evidence

### Mobile Core Validation

- Workflow: `Mobile Core Validation`
- Run number: `#706`
- Run ID: `36133983162`
- Head SHA: `936cb35ee4a9e79fa84a9edddb1313fccdd85dd2`
- Result: **SUCCESS**

Validated gates include frozen dependency install, reproducibility, Android build configuration, tracked-sensitive-file scan, full Git-history secret scan, High/Critical dependency gate, lint, TypeScript, Mobile Core regressions, Expo Doctor and Computer Agent Phase 0.

Automated counts on the accepted candidate:

- Mobile Core regressions: **649/649 PASS**;
- Expo Doctor: **21/21 PASS**;
- Computer Agent Phase 0: **10/10 PASS**;
- dependency gate: **0 Critical / 0 High / 2 reviewed Moderate**;
- full Git-history secret scan: **PASS**.

The two reviewed Moderate dependency advisories are the existing transitive `uuid` and `decode-uri-component` advisories already visible to the whole-core gate; neither is treated as a Section 09 authorization exception.

### CodeQL

- Workflow: `CodeQL Security Analysis`
- Run number: `#601`
- Run ID: `36133983176`
- Head SHA: `936cb35ee4a9e79fa84a9edddb1313fccdd85dd2`
- Result: **SUCCESS**
- JavaScript/TypeScript analysis: PASS.

## Implemented Section 09 Controls

The accepted candidate includes:

- strict find/ring/guidance request parsing with exact-key schemas;
- first-sequence-zero enforcement, monotonic sequencing, exact duplicate idempotence and conflict/gap rejection;
- existing Section 03 device IDs and trust evaluation rather than a parallel trust model;
- deterministic exact-device/alias target resolution with clarification on ambiguity;
- dedicated least-privilege `device.locate` and independent `device.ring` capability boundaries;
- strict locating-signal contracts for UWB, Bluetooth proximity, Wi-Fi presence, device reports, last-seen, manual hints, visual and spatial evidence;
- bounded reliability, timestamp and spatial-precision fields with NaN/infinity/unsafe-integer rejection;
- trusted-evaluation-time freshness with future/expired evidence rejection;
- signal replay, sequence, binding and cross-session conflict protection;
- a dedicated evidence-authorization boundary before fusion;
- exact account/device trust re-check for both the target and collector at evidence-consumption time;
- Section 04 sensor-policy re-authorization for UWB, Bluetooth proximity, Wi-Fi presence, visual/camera and spatial evidence;
- non-sensor evidence that cannot smuggle fabricated sensor authorization;
- deterministic evidence fusion independent of input order;
- explicit confidence classes `confirmed`, `high`, `medium`, `low`, `unknown`;
- conflict fail-closed behavior instead of arbitrary location selection;
- no precision upgrade beyond the strongest actually supported evidence/consensus;
- historical last-seen results that remain explicitly historical;
- strict runtime parsing of fused results, including semantic consistency between status, confidence, reason, precision and supporting evidence IDs;
- provider-neutral ring/vibrate/flash/wake adapter declarations with bounded TTL/revision;
- current trust and exact `device.ring` capability re-check at active locate-action execution;
- no substitution of `device.locate` or generic `device.control` for ring authority;
- Section 07 surface privacy classes reused for precise-location disclosure;
- automatic disclosure downgrade on shared surfaces and status-only output on public/untrusted surfaces;
- evidence-bounded guided-search modes that never invent direction, distance, room or proximity capability;
- historical evidence that never becomes live guidance;
- zero inherited tool, sensor, memory, disclosure or execution authority throughout Section 09.

## Adversarial Evidence Highlights

Regression coverage proves at minimum:

- malformed/unknown request fields and identities fail closed;
- alias collisions produce clarification rather than arbitrary selection;
- revoked/suspended/pending/account-mismatched devices are ineligible;
- target revocation after initial resolution prevents later locating evidence from producing a location;
- revoked or mismatched collector devices cannot authenticate sensor evidence;
- forged visual evidence without independent camera authorization is excluded;
- hidden authority, token/script and fabricated sensor-authorization fields fail closed;
- future/expired evidence cannot improve a result;
- stale strong evidence cannot override fresh weaker evidence;
- same-sequence conflicts, gaps and cross-session replay fail closed;
- reliable current evidence pointing to conflicting rooms resolves to `unknown`;
- two independent evidence kinds corroborate only the precision they actually share;
- a single weak signal cannot become `confirmed`;
- historical last-seen remains visibly historical;
- evidence input reordering does not alter deterministic fusion;
- malformed fusion-result spatial IDs, duplicate support IDs and confidence/reason contradictions are rejected;
- finer hidden spatial data cannot be carried under a coarser precision label;
- `device.locate` and generic `device.control` grants cannot substitute for `device.ring`;
- trust revocation or grant expiry after target resolution blocks active locate actions;
- stale/unavailable/unsupported adapters fail closed;
- personal-shared/household/public surfaces receive progressively less precise location disclosure;
- missing surface presentation capability prevents disclosure;
- directional guidance requires real exact direction evidence;
- distance guidance requires real distance evidence;
- room guidance deliberately downgrades to room precision;
- missing hardware/guidance capability falls back to manual search rather than fabricated precision.

## Closed Defects

See `docs/validation/SECTION_09_DEFECTS.md`.

No known unresolved Critical or High Section 09 defect remains in the automated/pre-device scope at the accepted implementation candidate.

## Deferred Layer 4 Evidence

Still mandatory before final Section 09 production closure:

- real Bluetooth proximity behavior;
- real UWB ranging/direction where supported;
- real Wi-Fi/last-seen behavior;
- physical ring/vibrate/flash/wake;
- offline and dead-battery targets;
- one-earbud / left-right / case behavior where supported;
- room transitions and real-world signal conflict behavior;
- guided-search feedback on physical devices;
- explicit camera opt-in and real visual evidence;
- AR guidance only on supported physical hardware;
- real shared-screen precise-location suppression;
- latency, battery and recovery behavior;
- accessibility and visible locating/status feedback.

## Acceptance Rule

Section 09 is accepted only at the pre-device level. MUDRIK may expose only the location, proximity or direction justified by current authorized evidence. It never turns proximity, sensor availability, adapter support or AI inference into trust or permission.
