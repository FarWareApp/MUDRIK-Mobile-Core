# Section 09 — Defect Record

## Acceptance Summary

At implementation candidate `936cb35ee4a9e79fa84a9edddb1313fccdd85dd2`, there are **no known unresolved Critical or High Section 09 defects** in the automated/pre-device scope.

Validation on that exact implementation candidate:

- Mobile Core Validation run `#706` / ID `36133983162`: **SUCCESS**;
- CodeQL Security Analysis run `#601` / ID `36133983176`: **SUCCESS**;
- Mobile Core regressions: **649/649 PASS**;
- Expo Doctor: **21/21 PASS**;
- Computer Agent Phase 0: **10/10 PASS**;
- dependency gate: **0 Critical / 0 High / 2 reviewed Moderate**;
- full Git-history secret scan: **PASS**.

The findings below were proven during the Section 09 deep implementation audit and closed before pre-device acceptance.

## S09-EVIDENCE-001 — Raw locating evidence lacked an independent source-authorization boundary

- Severity: **High**
- Status: **Closed**
- Area: locating evidence provenance / privacy / sensor authorization

### Problem

The initial Section 09 signal contract and registry correctly enforced:

- strict signal shape;
- bounded IDs, reliability and spatial precision;
- trusted-time freshness;
- replay/sequence/conflict checks.

However, a structurally valid UWB, Bluetooth, Wi-Fi, visual or spatial signal did not yet prove that:

1. the collector device was currently trusted for the exact account; and
2. the corresponding Section 04 sensor path was independently authorized.

If left unresolved, later fusion could have consumed forged or privacy-ineligible sensor evidence even though the evidence object itself passed parsing and freshness checks.

### Repair

A dedicated evidence-authorization boundary now runs before fusion:

- collector device trust is re-evaluated against the exact account/device binding;
- UWB, Bluetooth proximity, Wi-Fi presence, camera/visual and spatial signals require the mapped Section 04 sensor policy to authorize the direct user-requested interaction;
- non-sensor evidence such as bounded `last_seen`, `manual_hint` and `device_report` cannot smuggle a fabricated sensor-authorization object;
- target-device binding is checked independently from collector identity;
- signal freshness is re-evaluated with a trusted external evaluation time;
- hidden fields and inherited authority fail closed;
- the authorization result always reports `grantsAuthority: false`.

### Regression Evidence

- implementation: `69b0a0a03e824cb1f78a58cad71aca0bd96028e7`;
- regression contract: `1c1e4da68bf5d2dc51a0ecdb7de1f6b9d4d7b860`;
- implementation file: `src/core/deviceFinding/deviceFindingEvidenceAuthorization.ts`;
- test: `test/mobile-core/device-finding-evidence-authorization.test.mjs`.

Covered cases include revoked/mismatched collectors, visual evidence without camera authorization, hidden authority fields, target mismatch, future/expired evidence and historical non-sensor evidence.

## S09-TRUST-002 — Target trust could become stale after initial resolution

- Severity: **High**
- Status: **Closed**
- Area: target trust / mid-search revocation

### Problem

The target resolver correctly required an exact trusted Section 03 account/device binding when a finding session resolved its target.

Before this repair, later evidence consumption did not independently re-check the target's current trust state. A target revoked or suspended after resolution could therefore have remained eligible for subsequent locating fusion until another boundary rejected it.

That violated the Section 09 invariant that a device remains locatable only while current Section 03 trust proves the exact binding.

### Repair

The evidence-authorization boundary now also requires a current target-device trust input and re-evaluates it for every accepted evidence item:

- exact target account/device binding is required;
- revoked, suspended, rotation-required, pending or malformed target trust fails closed;
- target trust is independent from collector trust;
- fusion excludes evidence after target trust becomes ineligible;
- active ring/vibrate/flash/wake execution still performs its own separate trust re-check at execution time.

### Regression Evidence

- target-trust implementation: `953e1695b872ea6912e2a6c0b71f453860751a91`;
- evidence authorization regression: `6051b5cc32b04752bf8dfd501e2c52f0ce565cc3`;
- fusion revocation regression: `b94c97df5d994d57fc1ef78a52632209ab74d3de`;
- tests:
  - `test/mobile-core/device-finding-evidence-authorization.test.mjs`;
  - `test/mobile-core/device-finding-fusion.test.mjs`.

## Pre-Acceptance Scope Completed During the Audit

The following were incomplete Section 09 scope rather than previously exposed production defects. They were implemented before acceptance:

- deterministic evidence-bounded fusion/confidence;
- stale-strong versus fresh-weaker handling;
- reliable-location conflict fail-closed behavior;
- strict fused-result semantic parsing so confidence, precision, history and supporting IDs cannot contradict one another;
- current trust + exact `device.ring` capability re-check at active locate-action execution;
- provider-neutral ring/vibrate/flash/wake adapter declarations;
- surface-privacy disclosure downgrading using Section 07 privacy classes;
- evidence-bounded guided-search selection;
- historical evidence kept explicitly non-live;
- input-order deterministic results and zero inherited authority.

These areas are covered by the accepted-candidate regressions and whole-core validation.

## Deferred Layer 4

Real Bluetooth/UWB/Wi-Fi behavior, physical ring/vibrate/flash/wake, offline/dead-battery behavior, one-earbud cases, camera opt-in, AR guidance, shared-display behavior, latency, battery and accessibility remain physical Layer 4 obligations. Failures discovered there receive new defect IDs before production closure.
