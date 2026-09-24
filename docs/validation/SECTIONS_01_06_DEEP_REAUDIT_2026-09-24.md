# Sections 01–06 — Deep Re-Audit — 2026-09-24

## Result

`PRE-DEVICE DEEP RE-AUDIT COMPLETE — REAL-ENVIRONMENT LAYER 4 REMAINS DEFERRED`

Implementation candidate reviewed before this final evidence update:

`e6c271f8bb238eeeb2fa69fb80f3cf765bb19c37`

Exact implementation-candidate automation:

- Mobile Core Validation run #670 / ID `35958847143`: **SUCCESS**;
- CodeQL Security Analysis run #565 / ID `35958847115`: **SUCCESS**.

The final documentation HEAD must be revalidated after this record is committed. This document does not mark deferred physical validation as complete.

## Scope

This record captures the owner-requested deep re-audit performed before progressing beyond the current section boundary.

The audit covered the completed/pre-device surfaces of Sections 01 through 06 across:

- runtime code and contracts;
- tests, validation records and CI/security gates;
- security/privacy/identity policy boundaries;
- persistence, reset, migration and recovery behavior;
- async ordering, stale-result and monotonicity handling;
- strict runtime parsing, unknown fields, malformed IDs and unsafe numeric values;
- trusted-time/freshness semantics;
- voice generation, event ordering, playback truth and failover boundaries;
- diagnostics/secret minimization;
- accessibility, localization, RTL/LTR and reduced-effects contracts already testable pre-device;
- cross-section authority, permission, trust and privacy compatibility.

Later Section 07/08-era code present on the branch was inspected only where it consumes or could weaken Sections 01–06 invariants. This record does **not** claim those later sections complete and does not authorize moving to another section.

## Section 01 — Mobile Core / Platform Baseline

No new Critical/High Section 01 defect was proven by this re-audit.

The audited Section 01 core surfaces did not materially regress relative to the prior hardening baseline. Current whole-core validation continues to enforce frozen dependency installation, lint, TypeScript, Expo Doctor, secret-history scanning, dependency severity gating and CodeQL.

Physical-device Layer 4 remains deferred and is not converted into a pass by this re-audit.

## Section 02 — Platform Security

The re-audit found and closed `S02-TIME-001` (**High**): time-bound capability grants could use request-controlled time to appear unexpired/unrevoked.

Repair:

- time-sensitive grant validity requires a separate trusted evaluation time;
- malformed/missing trusted time fails closed where temporal authority is required;
- the request's `nowMs` is metadata and is not authoritative for expiry/revocation;
- the shared primitive lives in `src/core/security/trustedEvaluationTime.ts`.

Cross-section review also checked newer device/media capabilities. Current later-section execution policies bind capability subjects to independently trusted device identities before authorization; no additional Section 02 authority-bypass defect was proven in this audit.

See `SECTION_02_DEFECTS.md`.

## Section 03 — Identity / Authentication / Device Trust

The re-audit found and closed `S03-TIME-001` (**High**) across:

- authentication freshness;
- access-session validity;
- authentication challenges;
- pairing challenges;
- revocation step-up.

Identity security decisions now use the same trusted-time semantics as Section 02. The identity compatibility module re-exports the shared core-security primitive instead of maintaining divergent policy truth.

Session inventory, device trust and refresh-family boundaries were rechecked for strict identity/state parsing and stale/reuse behavior. No unresolved Critical/High defect was proven in the automated pre-device scope.

See `SECTION_03_DEFECTS.md`.

## Section 04 — Privacy / Permissions / Observation

The audit chain verified the earlier `S04-ORDER-001` repair and additionally found/closed:

- `S04-TRUTH-001` (**High**) — caller-controlled clock/freshness could make stale sensor evidence look current;
- `S04-TIME-002` (**Medium**) — unsafe finite timestamps could poison privacy monotonicity.

Current invariants rechecked:

- privacy commands are serialized;
- stale broadening is denied;
- restrictive state persistence never moves its privacy timestamp backwards;
- malformed time/read failure actively fails closed and requests passive sensors to stop;
- truth/indicator freshness uses trusted external time and a fixed maximum window;
- each sensor record is strictly parsed and duplicate sensor identities fail closed;
- permission and device trust must both be independently proven;
- direct interaction does not silently broaden passive observation authority;
- ordinary settings reset cannot erase dedicated observation privacy state.

See `SECTION_04_DEFECTS.md`.

## Section 05 — Voice Runtime

The re-audit found/closed:

- `S05-VOICE-006` (**Medium**) — oversized finite timestamps could poison VAD/STT/latency/audit ordering;
- `S05-VOICE-007` (**High**) — generation exhaustion could break the replay boundary.

The current coordinator/lifecycle was also rechecked:

- wrong-phase final transcripts do not poison the speech registry;
- VAD/STT/TTS generation and sequence boundaries reject stale/conflicting input;
- playback state does not advance to speaking/completion without TTS lifecycle evidence;
- barge-in requires qualified authorized input and echo/noise evidence;
- post-output provider failover cannot mix providers in the same generation;
- passive wake/hands-free activation remains subordinate to Section 04 privacy, permission and device-trust policy;
- voice lane selection never self-authorizes execution.

See `SECTION_05_DEFECTS.md`.

## Section 06 — Smart Companion

The re-audit rechecked and retained the existing hardening for:

- stale async profile operations;
- destructive reset/revision-fence protection;
- exact SQLite boolean parsing;
- provider-neutral reference secret filtering;
- exact-key profile validation;
- monotonic persistence revisions;
- zero execution/sensor/memory/disclosure authority.

It also found and closed `S06-UX-002` (**Medium**) — a failed save/reset could visibly report failure yet silently replace the user's in-editor draft when `saving` returned to false.

Repair:

- draft synchronization no longer depends on transient `saving`;
- opening the editor still synchronizes from the persisted/current profile;
- successful save/reset still synchronizes through the changed profile;
- failed persistence preserves the user's draft for correction/retry.

Implementation/regression:

- `891c4294fc260a23a571c37a1a4ee926d4f44ed3` — preserve draft on failed persistence;
- `84f96e780206a3873e1787b771c99180c7df0e0d` — regression contract;
- `e6c271f8bb238eeeb2fa69fb80f3cf765bb19c37` — defect record and implementation-candidate head.

See `SECTION_06_DEFECTS.md`.

## Cross-Section Compatibility Result

The current pre-device architecture preserves the audited shared invariants:

- trusted security time is separated from untrusted payload clocks;
- authority-sensitive timestamps, revisions, generations and sequences are bounded/monotonic where applicable;
- Section 03 account/device trust does not become Section 04 OS permission or sensor authority;
- Section 04 privacy restrictions are not widened by direct interaction, voice, companion state, restart or handoff metadata;
- Section 05 voice input and lane selection do not independently grant execution or monitoring authority;
- Section 06 personality/presence/profile state is presentation policy only and grants zero execution, sensor, memory or disclosure authority;
- later presence/handoff manifests inspected for compatibility carry references/state with `grantsInheritedAuthority: false`;
- later display/privacy consumers do not grant additional disclosure authority;
- diagnostics use shared sanitization, while specialized privacy/voice audit schemas remain content-minimized;
- persistence failures, malformed persisted data and stale async results do not silently widen authority in the audited paths;
- current UI contracts retain reduced-motion, localization, semantic accessibility and RTL-aware behavior that is testable pre-device.

No known unresolved **Critical or High** defect remains in the automated/pre-device scope of Sections 01–06 after these repairs.

## Evidence Semantics

Historical accepted candidate SHAs in individual Section Gate/Evidence documents remain historical acceptance points. Supplemental defect registers and this record describe later hardening now present on the branch.

A green workflow on an older SHA is not used to close the final re-audit. The final evidence commit must itself receive both required workflows on its exact HEAD.

## Deferred Layer 4

Still open where applicable:

- real Android/device permission behavior;
- real sensor start/stop and hardware indicators;
- process death/restart and installed-database migration;
- physical multi-device/handoff behavior;
- real audio/acoustic interruption and provider behavior;
- screen reader/accessibility validation;
- Arabic/German/English RTL/LTR and mixed-language visual verification;
- keyboard/safe-area/device-size visual behavior;
- production-like provider, avatar, hardware and performance checks.

No Layer 4 obligation is silently marked PASS. This re-audit is **pre-device**, not final production/freeze authorization.

## Stop Condition

After this evidence update, the deep re-audit is complete only when **Mobile Core Validation** and **CodeQL Security Analysis** both report **SUCCESS on the same exact final HEAD**.

No new section is entered as part of this audit.
