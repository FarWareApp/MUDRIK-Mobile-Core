# Section 09 — Defect Record

## Current Acceptance State

Section 09 remains `PRE-DEVICE IMPLEMENTATION — ACTIVE` until the exact final implementation/evidence HEAD receives both required green workflows.

The finding below was proven during the Section 09 deep implementation audit and closed before pre-device acceptance.

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

## Pre-Acceptance Scope Completed After the Finding

The following were incomplete Section 09 scope rather than previously exposed production defects. They were implemented before acceptance:

- deterministic evidence-bounded fusion/confidence;
- stale-strong versus fresh-weaker handling;
- conflict fail-closed behavior;
- current trust + `device.ring` capability re-check at active locate-action execution;
- provider-neutral ring/vibrate/flash/wake adapter declarations;
- surface-privacy disclosure downgrading using Section 07 privacy classes;
- evidence-bounded guided-search selection.

These areas receive normal regression coverage and remain subject to the final exact-HEAD gate.

## Deferred Layer 4

Real Bluetooth/UWB/Wi-Fi behavior, physical ring/vibrate/flash/wake, offline/dead-battery behavior, camera opt-in, AR guidance, shared-display behavior, latency, battery and accessibility remain physical Layer 4 obligations. Failures discovered there will receive new defect IDs before production closure.
