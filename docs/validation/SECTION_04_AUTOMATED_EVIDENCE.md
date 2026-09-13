# Section 04 — Automated Evidence

## Acceptance State

`PRE-DEVICE COMPLETE — OPEN / REAL-ENVIRONMENT LAYER 4 DEFERRED`

This evidence closes the automated/pre-device obligations for Section 04 only. It does not claim that real Android sensor, permission, hardware-indicator or cross-device behavior has passed.

## Accepted Pre-Device Candidate

- Commit: `0bfc86e83bdca2bf79ad1ff061709a08889501c4`
- Branch: `mudrik-core-v1`

## Validation Evidence

### Mobile Core Validation

- Workflow: `Mobile Core Validation`
- Run number: `#192`
- Run ID: `34773109075`
- Result: **SUCCESS**

Validated gates on the exact candidate:

- frozen dependency install: PASS;
- dependency-manifest reproducibility: PASS;
- Android device build configuration gate: PASS;
- tracked sensitive-file gate: PASS;
- full Git-history secret scan: PASS;
- dependency High/Critical gate: PASS;
- reviewed advisory paths: PASS;
- ESLint: PASS;
- TypeScript: PASS;
- Mobile/Security/Identity/Privacy regressions: **151/151 PASS**;
- Expo Doctor: **21/21 PASS**;
- Computer Agent Phase 0 tests: **10/10 PASS**.

Dependency audit at acceptance:

- Critical: `0`
- High: `0`
- Moderate: `2` reviewed transitive advisories

Reviewed Moderate paths remain:

1. `uuid@7.0.3` through Expo configuration tooling;
2. `decode-uri-component@0.2.2` through `expo-router -> query-string`.

No incompatible dependency override is accepted merely to hide an advisory.

### CodeQL

- Workflow: `CodeQL Security Analysis`
- Run number: `#85`
- Run ID: `34773109004`
- Result: **SUCCESS**
- JavaScript/TypeScript analysis: PASS.

## Implemented Section 04 Controls

The accepted candidate includes:

- deterministic observation privacy state machine with `active`, `visual_off`, `ambient_off`, and `privacy_lock`;
- exact natural-language privacy fast path for canonical Arabic, English, and German stop/resume phrases;
- fail-closed malformed-input handling;
- explicit reactivation checks for user request, OS permission, trusted device, and runtime availability;
- monotonic Sensor-State Registry with stale/conflicting event rejection;
- passive-versus-direct-interaction separation;
- deterministic sensor activation policy below AI/model/personality;
- truthful observation-state resolver that distinguishes active, direct-only, not-observing, unverifiable, and policy-violation states;
- dedicated schema V7 persistence in `observation_privacy_state` outside resettable `app_settings`;
- fresh-install default `ambient_off`;
- missing/corrupt/unreadable privacy persistence failing closed to `privacy_lock`;
- coordinator ordering: persist restriction -> stop sensors -> verify;
- restart/handoff reconciliation that re-enforces already-persisted restrictive policy;
- broadening denied when persistence fails;
- privacy-safe security-event types and strict audit metadata allowlist;
- deterministic privacy indicator model for camera, microphone, location, presence, health, and spatial surfaces;
- policy-violation and unverifiable states exposed to the UI model rather than hidden;
- ordinary Settings reset structurally unable to erase observation privacy policy.

## Adversarial Evidence Highlights

Regression coverage proves at minimum:

- restart/model restart/handoff/room change/new conversation do not silently re-enable observation;
- malformed nested reactivation state fails closed;
- optional `reactivationChecks: undefined` is treated as absent while any actual provided value is strictly validated;
- passive camera is blocked under `visual_off`;
- all passive observation is blocked under `ambient_off`/`privacy_lock`;
- direct explicit interaction does not itself broaden passive monitoring authority;
- stale/unknown/unavailable registry state cannot produce a false "not observing" answer;
- stale and same-sequence conflicting sensor updates are rejected;
- active unauthorized sensor state becomes a policy violation;
- persistence failure never broadens privacy authority;
- sensor-stop failure cannot be reported as successful privacy enforcement;
- privacy audit rejects arbitrary raw sensor payload fields;
- Settings reset cannot delete the dedicated privacy row.

## Deferred Layer 4 Evidence

Still mandatory before final Section 04 closure:

- real Android camera allow/deny/revoke and start/stop behavior;
- real Android microphone allow/deny/revoke and start/stop behavior;
- location/health/spatial hardware behavior where those surfaces enter release scope;
- background/foreground/process-death/reboot persistence;
- real OS privacy indicators;
- real sensor-stop confirmation;
- direct interaction while passive privacy lock is active;
- actual cross-device handoff on each supported surface;
- runtime permission changes from system settings while MUDRIK is running;
- upgrade/migration preserving restrictive state;
- network interruption for any remote observation adapter;
- independent privacy/security review of production sensor adapters and reactivation paths.

## Acceptance Rule

This document proves only the pre-device implementation and automated security/correctness gates. Section 04 remains open until all applicable real-environment Layer 4 obligations pass on an exact production-like candidate.
