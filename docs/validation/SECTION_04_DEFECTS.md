# Section 04 — Defect Register

## Current State

No unresolved Blocker, Critical or High defect is known in the accepted Section 04 pre-device scope.

The items below were discovered by the Section 04 validation process and closed before pre-device acceptance.

---

## S04-INPUT-001 — Malformed reactivation checks could bypass nested validation on a no-op path

Severity: **High**

Status: **Closed**

### Problem

An early state-machine implementation validated `reactivationChecks` only when a reactivation would actually change state. A crafted request such as `resume_visual` while already `active` could therefore reach the `no_change` path without validating a malformed nested checks object.

This did not itself activate a new sensor, but it violated the security invariant that untrusted privacy-control input must be validated consistently regardless of whether the requested transition is a no-op.

### Risk

Allowing malformed control input to be silently accepted creates inconsistent parser semantics and can become an authority-widening primitive after future state-machine changes.

### Fix

- any actually provided non-`undefined` `reactivationChecks` object is parsed and validated before no-op handling;
- only the four expected boolean fields are accepted;
- extra fields fail closed;
- malformed nested values fail closed to `privacy_lock`;
- checks supplied to a non-reactivation event fail closed.

### Regression Evidence

`observation-privacy-state.test.mjs` covers malformed nested checks, unknown fields, invalid state/event input, and fail-closed behavior.

Accepted in candidate:

`0bfc86e83bdca2bf79ad1ff061709a08889501c4`

---

## S04-OPTIONAL-001 — Optional undefined reactivation checks were initially treated as explicit malformed input

Severity: **Medium**

Status: **Closed**

### Problem

The first hardening for S04-INPUT-001 used property presence alone. The coordinator constructs transition input with an optional `reactivationChecks` field whose runtime value can be `undefined`. That legitimate optional form was interpreted as if an attacker had explicitly supplied malformed checks.

As a result, restrictive commands and lifecycle reconciliation could be over-denied in automated tests.

### Security Impact

This was a fail-closed availability/correctness regression rather than an authority widening. It did not make monitoring easier to enable; it blocked legitimate restrictive processing.

### Fix

`reactivationChecks: undefined` is semantically treated as absent. Any non-`undefined` supplied value is still strictly validated, and supplied checks remain forbidden on event types that do not accept reactivation proof.

### Regression Evidence

Coordinator tests cover:

- privacy lock persistence;
- persistence failure;
- sensor-stop failure;
- restart reconciliation;
- device-handoff reconciliation;
- denied broadening;
- fail-closed recovered state;
- invalid timestamp handling.

Final candidate regression suite: **151/151 PASS**.

---

## S04-RESTART-001 — Restrictive policy could skip sensor reconciliation when state value did not change

Severity: **High**

Status: **Closed**

### Problem

An early coordinator path could return `no_change` when the persisted policy was already restrictive, without re-running the sensor-stop/reconciliation operation. After process restart or device handoff, the policy value could therefore remain correct while runtime sensor state had not yet been re-confirmed.

### Risk

Persisted policy and runtime enforcement must never be treated as interchangeable. A restrictive stored policy alone is not evidence that every MUDRIK-controlled passive sensor is actually stopped.

### Fix

Already-restrictive states now trigger enforcement reconciliation on restart/handoff and equivalent lifecycle preservation paths:

- `visual_off` re-confirms passive visual shutdown;
- `ambient_off` and `privacy_lock` re-confirm all passive observation shutdown.

### Regression Evidence

Dedicated coordinator tests verify restart and handoff re-enforcement and verify that incomplete sensor stop remains an explicit failure rather than being reported as success.

---

## S04-RESET-001 — Observation privacy persistence could not be placed in ordinary settings

Severity: **High architectural defect prevented before implementation**

Status: **Closed by design**

### Finding

`SettingsRepository.clear()` deletes the `app_settings` table content. Storing `privacy_lock` or observation policy there would make a normal Reset Settings operation capable of erasing the user's monitoring restriction.

### Resolution

Schema V7 introduces the dedicated singleton table:

`observation_privacy_state`

It is independent of ordinary settings reset. Missing/corrupt/unreadable privacy state fails to `privacy_lock`, while a fresh valid install initializes to `ambient_off`.

### Regression Evidence

Migration and storage tests verify that ordinary settings reset is structurally unable to delete observation privacy policy.

---

## Closure Rule

Any future change that weakens the behavior above reopens the relevant defect and blocks Section 04 final closure until it is fixed and revalidated.
