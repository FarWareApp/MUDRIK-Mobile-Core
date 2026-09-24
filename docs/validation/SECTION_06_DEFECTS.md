# Section 06 — Defect Record

## Acceptance Summary

At the accepted pre-device candidate `97ac1435eee06a96e4de1b2797baa5ec90a0c3e0`, there are **no known unresolved Critical or High Section 06 defects**.

The issues below were discovered during Section 06 implementation and were closed before pre-device acceptance.

## S06-PROFILE-001 — Authority-bearing or malformed profile fields needed a strict boundary

- Severity: **Medium**
- Status: **Closed**
- Area: Companion profile validation

### Problem

The legacy companion shape did not provide a sufficiently strict runtime boundary for the expanded profile. A permissive profile parser could have allowed unknown fields such as provider/model identifiers, credentials, tool scopes, permission-like fields or prompt-like authority hints to travel farther than intended.

### Repair

- added exact-key profile validation;
- bounded names, numeric personality dimensions, speaking rate and language lists;
- rejected malformed/unknown fields;
- rejected credential-shaped values in provider-neutral profile references;
- kept memory binding as a non-authoritative reference only;
- added adversarial regressions for authority-shaped field injection.

### Evidence

`test/mobile-core/companion-core.test.mjs`

## S06-DATA-001 — Stale profile writes could overwrite newer settings

- Severity: **Medium**
- Status: **Closed**
- Area: SQLite companion persistence

### Problem

A plain last-write-wins profile repository does not distinguish a current edit from a stale edit. Two overlapping save flows could therefore replace a newer profile with an older snapshot.

### Repair

- added explicit profile `revision`;
- repository updates require monotonic revision advancement;
- writes that do not advance revision are rejected;
- persisted profile is validated before it is exposed;
- added repository regression coverage.

### Evidence

`test/mobile-core/companion-repository.test.mjs`

## S06-UX-001 — Failed profile save could close the editor and imply success

- Severity: **Low**
- Status: **Closed**
- Area: Companion profile editor

### Problem

The earlier UI flow closed the editor after awaiting save even when the controller had caught a repository failure. This could visually imply that changes were saved when persistence had actually failed.

### Repair

- save now returns a success result;
- editor remains open when persistence fails;
- error state stays visible to the user;
- display name is trimmed and blank names are rejected before persistence.

## S06-CODE-001 — Companion session effect produced a React Hooks dependency warning

- Severity: **Low**
- Status: **Closed**
- Area: React hook dependency hygiene

### Problem

`CompanionScreen` referenced the session object through an effect in a way that triggered `react-hooks/exhaustive-deps` warning even though the build did not fail.

### Repair

The effect dependency boundary was rewritten to use stable explicit session members. The accepted candidate's lint run is clean for Section 06.

## Deferred Findings Are Not Defects Yet

The following are validation debt rather than proven defects until Layer 4 runs:

- physical keyboard/safe-area behavior;
- real process-death persistence;
- real upgrade from an installed pre-V8 database;
- Android accessibility/screen-reader behavior;
- Arabic/German/English RTL/LTR visual behavior;
- production-like voice/avatar rendering;
- physical performance and visual regression.

Any Layer 4 failure will receive a new defect ID, regression coverage where feasible, repair, and exact-candidate retest before final closure.

## S06-ASYNC-001 — Stale profile async operations could update a replaced/unmounted controller

- Severity: **Medium**
- Status: **Closed**
- Area: companion profile controller

### Problem

Overlapping load/mutation work needed an explicit ownership boundary so a delayed repository result could not update state after repository replacement, a newer request, or component unmount.

### Repair

The controller now uses mount, source-revision, request-id and mutation-id guards, invalidates stale loads when mutations begin, and serializes profile mutations.

### Regression Evidence

- implementation: `6128d4e979ec6f91070168365570d18cdfa0e9dd`;
- regression: `961eeb223b9a3c5da78795560d95b41aa2212d78`.

## S06-DATA-002 — Reset path could erase the monotonic revision fence

- Severity: **High**
- Status: **Closed**
- Area: companion persistence/reset

### Problem

A destructive profile-clear/reset API could remove the persisted row that carries the monotonic revision. Re-inserting a default revision would erase the stale-write fence and could allow an older edit to become current.

### Repair

- the destructive companion clear API was removed;
- reset is persisted as an ordinary profile update with `revision + 1`;
- reset preserves identity/creation history and uses monotonic `updatedAt`;
- repository stale-write protection remains in force.

### Regression Evidence

- `69248fda277e0d7db821ab498b34d7f57074fb62`;
- `e99ccaf739761b85838d0aaea0f562ee5f7d8611`;
- `2e54da20039f1506fd26b39719b189b94dab6a5a`.

## S06-DATA-003 — Corrupt SQLite booleans could be coerced into valid profile state

- Severity: **Medium**
- Status: **Closed**
- Area: persisted profile parsing

### Problem

Persisted integer booleans require exact `0/1` semantics. Truthy coercion of corrupt values such as `2` or `-1` could hide database corruption and expose a state the strict runtime profile parser never actually received.

### Repair

SQLite booleans are now parsed only from exact `0` or `1`; every other value becomes invalid and the persisted profile fails closed.

### Regression Evidence

- implementation: `123694177cc31180208c279b03c0719a9acd7190`;
- regression: `9d5e8cd1d9b42a2571489e54a1264c38e84d455c`.

## S06-SECRET-001 — One high-confidence credential shape could pass provider-neutral profile references

- Severity: **Medium**
- Status: **Closed**
- Area: voice/avatar/memory profile references

### Problem

The credential-shape filter caught token-like delimiter forms but a Google-style `AIza...` shape embedded after a valid profile-reference prefix could pass validation. That contradicted the Section 06 rule that provider-neutral references must not carry credential-shaped values.

### Repair

A dedicated high-confidence secret-prefix guard now rejects the Google-style key shape while retaining strict provider-neutral reference syntax. The regression fixture is assembled at runtime so the repository's full-history secret scanner remains strict and is not weakened.

### Regression Evidence

- implementation: `939327dbdee868788e0fa1fcb4b1a87d545be097`;
- regression coverage: `test/mobile-core/companion-core.test.mjs`;
- the synthetic credential-shape fixture is assembled at runtime so the full-history scanner is not weakened.

