# Sections 01–06 — Deep Re-Audit — 2026-09-24

## Scope

This record captures the owner-requested deep re-audit performed before progressing beyond the current section boundary.

The audit covered the completed/pre-device surfaces of Sections 01 through 06 across:

- runtime code and contracts;
- security/privacy/identity policy boundaries;
- persistence and migration behavior;
- async ordering, stale-result and monotonicity handling;
- voice generation/event ordering;
- accessibility, localization and reduced-effects contracts already testable pre-device;
- dependency/workflow/security gates;
- cross-section policy compatibility.

Section 07 code present on the branch was treated only as a compatibility surface. This record does **not** claim Section 07 completion and does not authorize Section 08.

## Section 01 — Mobile Core / Platform Baseline

No new Critical/High Section 01 defect was proven by this re-audit.

The current branch remains on Expo SDK 57 and its patch-aligned dependency family. Frozen dependency installation, lint, TypeScript, Expo Doctor, secret-history scanning, dependency severity gating and CodeQL remain mandatory exact-head gates.

Physical-device Layer 4 remains deferred and is not converted into a pass by this re-audit.

## Section 02 — Platform Security

A High trusted-time defect was found and closed.

Time-bound capability grants no longer use request-controlled `nowMs` as the authority for expiry/revocation. A separate trusted evaluation time is required and malformed/missing trusted time fails closed where time authority is required.

See `SECTION_02_DEFECTS.md` / `S02-TIME-001`.

## Section 03 — Identity / Authentication / Device Trust

A High cross-policy trusted-time defect family was found and closed across:

- authentication freshness;
- access-session validity;
- authentication challenges;
- pairing challenges;
- revocation step-up.

The identity compatibility helper now re-exports the shared core-security trusted-time primitive instead of maintaining a second policy truth.

See `SECTION_03_DEFECTS.md` / `S03-TIME-001`.

## Section 04 — Privacy / Permissions / Observation

The re-audit closed two additional gaps:

1. observation truth can no longer use caller-controlled time or widen the fixed freshness ceiling to make stale sensor evidence look current;
2. security-sensitive privacy timestamps are bounded to non-negative safe integers so monotonic/persistence ordering cannot be poisoned by oversized finite numbers.

Existing command serialization, stale-broadening denial, active fail-closed sensor stopping, dedicated privacy persistence and permission/trust separation remain intact.

See `SECTION_04_DEFECTS.md` / `S04-TRUTH-001` and `S04-TIME-002`.

## Section 05 — Voice Runtime

The re-audit closed:

- oversized finite timestamp acceptance in VAD/STT/latency/audit ordering;
- voice generation exhaustion beyond `Number.MAX_SAFE_INTEGER`.

Provider failover still forbids post-output mixing without explicit restart plus generation rotation. Passive voice activation remains subordinate to Section 04 privacy policy, permission and device trust.

See `SECTION_05_DEFECTS.md` / `S05-VOICE-006` and `S05-VOICE-007`.

## Section 06 — Smart Companion

The re-audit closed additional profile/runtime gaps:

- stale async profile operations across repository replacement/unmount;
- destructive reset semantics that could erase the monotonic revision fence;
- corrupt SQLite boolean coercion;
- an uncovered high-confidence Google-style credential shape inside provider-neutral profile references.

The companion remains presentation policy only and grants zero execution, sensor, memory or disclosure authority.

See `SECTION_06_DEFECTS.md` / `S06-ASYNC-001`, `S06-DATA-002`, `S06-DATA-003` and `S06-SECRET-001`.

## Cross-Section Compatibility Result

The current pre-device architecture preserves these shared invariants:

- trusted security time is separate from untrusted decision payload clocks;
- authority-sensitive timestamps use safe-integer monotonic semantics;
- Section 03 device/account identity does not become Section 04 sensor permission;
- Section 04 privacy restrictions are not broadened by direct interaction;
- Section 05 voice input does not independently grant microphone/passive-observation authority;
- Section 06 companion personality/presence does not grant execution, sensor, memory or disclosure authority;
- diagnostics pass through the shared sanitizer and specialized privacy/voice audit schemas remain content-minimized;
- persistence failures and malformed persisted data do not silently widen authority;
- stale asynchronous results are discarded where audited controllers depend on replaceable repositories/services.

## Documentation Semantics

The accepted candidate SHAs recorded in each historical Section Gate/Evidence document remain valid historical acceptance points for the code that existed at those times.

They are **not** intended to imply that later supplemental hardening is absent. The defect registers and this re-audit record describe the additional hardening now present on the branch.

## Deferred Physical Validation

This re-audit is pre-device only.

Applicable Layer 4 work still includes real Android/device behavior, process death/restart, real permission and OS lifecycle behavior, physical audio/acoustic behavior, real accessibility/screen-reader checks, RTL/LTR visual verification, and production-like device/provider surfaces.

No deferred Layer 4 item is silently marked PASS.

## Closure Rule

This deep re-audit is considered complete only when the final branch HEAD after these documentation changes has both:

- Mobile Core Validation: SUCCESS;
- CodeQL Security Analysis: SUCCESS;

on that same exact HEAD, with no unresolved Critical/High defect found by the re-audit.
