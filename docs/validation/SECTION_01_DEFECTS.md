# Section 01 — Defect Record

This file records defects discovered while closing the Mobile Core freeze gate. Defects are retained after closure so the fix and regression evidence remain auditable.

## S01-DATA-001 — Project-only attachment could be deleted as an orphan

- **Date:** 2026-09-12
- **Severity:** High
- **Status:** Closed
- **Area:** Local attachment storage / project files / storage maintenance
- **Detected by:** Adversarial review of `SQLiteAttachmentRepository.listOrphans()` during Section 01 freeze validation

### Test case

Run orphan attachment maintenance when an attachment is linked to a project but is not linked to a chat message or draft.

### Reproduction

1. Persist an attachment in `attachments`.
2. Link the attachment only through `project_attachments`.
3. Leave the attachment absent from `message_attachments` and `draft_attachments`.
4. Execute `AttachmentCleanupService.cleanupOrphans()`.

### Expected result

The attachment is not considered orphaned because it is still owned by a project. Neither its database record nor its managed local file may be deleted.

### Actual result before fix

`SQLiteAttachmentRepository.listOrphans()` checked only `message_attachments` and `draft_attachments`. A project-only attachment could therefore be returned as an orphan and subsequently deleted by cleanup.

### Root cause

The orphan SQL query did not join or test `project_attachments`. The storage ownership model had gained project-file links, but the orphan classification query had not been expanded to include that third ownership path.

### Security / data-integrity impact

A valid user project file could be destroyed during orphan cleanup even though the project still referenced it. This is classified **High** because it can cause user-visible local data loss in a normal product workflow.

### Fix

Commit: `8bbdb93dbf76c72485552a3a750547b850ea9bf9` — `protect project attachments from orphan cleanup`

The orphan query now excludes attachments referenced by any of:

- `message_attachments`;
- `draft_attachments`;
- `project_attachments`.

An attachment is eligible for orphan cleanup only when all three ownership links are absent.

### Regression test

Commit: `fc9d407af881437196ace43cd858b356dfdc33df` — `regress project attachment orphan protection`

Regression file: `test/mobile-core/attachment-repository.test.mjs`

The test asserts that the orphan query contains all three ownership joins and all three null-reference conditions.

Related maintenance regressions also verify that `AttachmentCleanupService` operates only on repository-reported orphans and continues safely when one orphan cleanup fails.

### Retest evidence

GitHub Actions `Mobile Core Validation` run **#76**, run ID `34701696198`, on exact commit `fc9d407af881437196ace43cd858b356dfdc33df`:

- workflow conclusion: **success**;
- Mobile Core automated tests: **27/27 passed**;
- TypeScript: **passed**;
- ESLint: **passed**;
- Expo Doctor: **21/21 passed**;
- dependency High/Critical gate: **0 High / 0 Critical**;
- full Git-history secret scan: **passed**;
- Computer Agent Phase 0 tests: **10/10 passed**.

### Physical retest requirement

The automated regression closes the code-level defect. The final Section 01 physical-device matrix must still verify project-file add/remove/delete and orphan-maintenance behavior on the app-owned Android build before `MOBILE-CORE-FROZEN` is created.

## S01-RUNTIME-002 — Expo Go startup crash from eager `expo-notifications` imports

- **Date:** 2026-09-13
- **Severity:** High
- **Status:** Code Fixed / Physical Retest Pending
- **Area:** Android startup / Expo Go compatibility / notifications / permissions
- **Detected by:** Physical Android testing in Expo Go

### Reproduction

1. Run the current MUDRIK Mobile bundle in Expo Go on Android.
2. Allow the root provider/composition graph to load.
3. Observe startup before the main application screen renders.

### Actual result before fix

The application raised an uncaught `expo-notifications` runtime error because Android remote notification functionality is unavailable in Expo Go. The first eager import was in notification presentation/service code; after those paths were guarded, a second physical retest exposed another eager import in `NativePermissionService.ts`.

Because the import failed while Expo Router was evaluating the root module graph, secondary/cascading diagnostics appeared, including:

- `_layout.tsx` reported as missing a required default export even though the file has one;
- Expo Router render failure involving `ErrorBoundary`.

These secondary errors were consequences of root module evaluation failure, not independent `_layout.tsx` defects.

### Root cause

Bootstrap-sensitive code statically imported `expo-notifications`. Static module evaluation happened before runtime compatibility checks, so Expo Go could fail before MUDRIK had a chance to degrade notification functionality safely.

### Fix

Relevant commits:

- `c17809cd0045ccb4c1660a4c99134cc5697715ca` — add runtime notification support detection;
- `2672335aeb8223f3e6268657cc4aa2ab82b74aa5` — lazy-load notification presentation;
- `5008f14d6fc795d536a78a9b4e12f44e3f628d9d` — lazy-load the native notification service;
- `7e5c941ed5c8f89aca98c6543514d8fe6e949ecd` — guard notification permission access in `NativePermissionService`;
- `a923d515e76d0df73023c83e77430fd6cdc78175` — extend the compatibility regression to the permission path.

The runtime now rejects Expo Go/web before native notification module evaluation. Unsupported notification permission state is represented as unavailable/unknown through the app contract with `canAskAgain: false`; the app does not fake success.

### Regression test

`test/mobile-core/notification-runtime-compat.test.mjs`

The regression verifies that bootstrap-sensitive notification and permission paths do not statically evaluate `expo-notifications`, and that Expo Go/web compatibility checks occur before native module loading.

### Automated retest evidence

On exact candidate `a923d515e76d0df73023c83e77430fd6cdc78175`:

- Mobile Core Validation run **#250**, run ID `34780320239`: **SUCCESS**;
- CodeQL Security Analysis run **#143**, run ID `34780320235`: **SUCCESS**;
- ESLint: **PASS**;
- TypeScript: **PASS**;
- Mobile Core regression suite: **PASS**;
- Expo Doctor: **PASS**;
- Computer Agent Phase 0: **PASS**;
- dependency High/Critical gate: **PASS**;
- full Git-history secret scan: **PASS**.

### Physical retest requirement

This defect is not fully closed until the same Android device launches the updated candidate in Expo Go after pulling the branch and clearing the Metro cache, with no `expo-notifications`, `_layout.tsx`, or router `ErrorBoundary` startup failure.

Production notification behavior must still be validated separately in a development/standalone build because Expo Go is not the target runtime for Android remote push notifications.
