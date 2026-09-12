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
