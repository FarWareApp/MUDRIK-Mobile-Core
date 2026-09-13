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
