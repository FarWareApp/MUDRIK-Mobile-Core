# Section 04 — Defect Register

## Current State

No unresolved Blocker, Critical or High defect is known in the accepted Section 04 pre-device scope.

The items below were discovered by the Section 04 validation process and closed before or after the original pre-device acceptance. Later hardening remains part of the Section 04 regression contract.

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

Final original candidate regression suite: **151/151 PASS**.

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

## S04-ORDER-001 — Concurrent or stale broadening commands could race newer restrictive intent

Severity: **High**

Status: **Closed**

### Problem

`ObservationPrivacyCoordinator.apply()` previously allowed independent asynchronous commands to overlap. A delayed `unlock_privacy` or resume operation could therefore race a later restrictive command. The coordinator also did not explicitly reject a broadening command whose timestamp was older than the currently persisted privacy decision.

### Risk

Privacy intent is authority-sensitive. A stale or slow broadening operation must never overtake a newer stop/lock decision, and an older replay must never widen authority after a more recent restriction has been persisted.

### Fix

- coordinator commands are serialized in invocation order through a private command tail;
- a rejected/failed command cannot break the queue for later commands;
- broadening events older than the persisted privacy timestamp are rejected as `stale_broadening_denied`;
- restrictive writes use `max(input.nowMs, current.updatedAtMs)` so the privacy clock cannot move backwards;
- malformed timestamps and privacy-policy read failures actively fail closed and request all passive observation to stop instead of returning only a synthetic policy value.

### Regression Evidence

`test/mobile-core/observation-privacy-coordinator.test.mjs` now proves:

- stale broadening is denied without persistence or sensor activation;
- restrictive writes never regress the persisted privacy timestamp;
- a delayed unlock followed by a later lock executes in invocation order and ends in `privacy_lock`;
- policy-read failure and invalid timestamps fail closed while actively stopping passive observation.

Implementation candidate:

`458d250a15bf78b403cd9db10f48aede8dd7eeb9`

Validation on that exact implementation candidate:

- Mobile Core Validation run ID `35125961670`: **SUCCESS**;
- CodeQL Security Analysis run ID `35125961690`: **SUCCESS**.

---

## Closure Rule

Any future change that weakens the behavior above reopens the relevant defect and blocks Section 04 final closure until it is fixed and revalidated.

---

## S04-TRUTH-001 — Untrusted clock/freshness input could make stale sensor evidence look current

Severity: **High**

Status: **Closed**

### Problem

Observation truth originally evaluated sensor freshness from `nowMs` and a caller-supplied freshness window in the same untrusted input. A rolled-back clock or widened freshness window could therefore classify stale sensor evidence as current and undermine truthful privacy-state reporting.

### Fix

- observation truth requires a separate trusted evaluation time;
- the caller may only narrow, never widen, the fixed maximum freshness window;
- every sensor record is parsed through the strict runtime parser before use;
- duplicate sensor identities fail closed;
- future, stale, unknown and unavailable sensor evidence becomes explicitly unverifiable.

### Regression Evidence

- strict parser exposure: `bbc4640510b2b77f3ce2d2c95f591f7beab9aec6`;
- trusted-time repair: `0e81914838921accf0bf40f2020e39843dcdadf4`;
- rollback/freshness regressions: `78cb131fa80e8279719189c7b7854fabeb175db3`.

## S04-TIME-002 — Unsafe finite timestamps could poison privacy monotonicity

Severity: **Medium**

Status: **Closed**

### Problem

Several privacy/audit/storage paths rejected NaN/Infinity but still admitted finite numbers outside JavaScript's safe-integer range. Such values are not reliably ordered as millisecond revisions and could poison later monotonic comparisons or durable state.

### Fix

Security-sensitive privacy timestamps are now non-negative safe integers across command, sensor, persistence, audit and indicator paths. Dedicated regressions cover unsafe persisted/runtime values.

### Regression Evidence

Implementation and regression commits include:

- `478652004f79deda70e3773991b72266ba39c954`;
- `efe8d4f7fca1fac994594c07257c5d4b64fd4274`;
- `abad368535afc21e3221a9cd7e57c18771c16894`;
- `c7f18d0cbe024e50c06e4e326d8d85381dea0ef9`;
- `1c299187e7113611c41f3fb1870d74f5087a05da`;
- follow-up unsafe-value regressions on 2026-09-18.

