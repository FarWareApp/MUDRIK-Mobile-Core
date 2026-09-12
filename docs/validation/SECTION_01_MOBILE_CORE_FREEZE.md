# Section 01 — Mobile Core Freeze Validation

## Status

`ACTIVE`

Section 01 is the only active implementation section under `MUDRIK_20_SECTION_EXECUTION_PLAN.md`.

The section cannot close until all five validation layers pass and the physical-device evidence is complete.

The mandatory Android execution procedure is defined in `docs/validation/SECTION_01_ANDROID_DEVICE_RUNBOOK.md`.

## Layer 1 — Specification and Static Correctness

### Required

- [x] Mobile-first architecture remains decoupled from production AI/server transport.
- [x] Core hardening architecture is documented.
- [x] Secret-file ignore rules are present.
- [x] Error/diagnostic sanitization is implemented.
- [x] RTL/LTR and Reduced Motion requirements are represented in the core.
- [ ] TypeScript passes against the exact final candidate commit.
- [ ] Expo Doctor passes against the exact final candidate commit.
- [ ] Repository secret scan passes against the exact final candidate commit.
- [ ] Dependency/configuration review passes against the exact final candidate commit.

Layer 1 is not final until it is rerun on the exact commit that will be frozen.

### Automated gate now present

The branch CI currently enforces all of the following before the physical-device freeze gate:

- frozen Yarn dependency installation;
- package/lockfile reproducibility check;
- pinned GitHub Actions commit SHAs;
- pinned Expo Doctor version;
- tracked `.env`/private-key file rejection;
- full Git-history credential/private-key pattern scan;
- dependency audit that blocks High/Critical advisories;
- ESLint;
- TypeScript;
- Mobile Core regression tests;
- Expo Doctor;
- Computer Agent Phase 0 tests.

The final candidate must still rerun the same gate after all physical-device defects are fixed.

## Layer 2 — Unit and Component Verification

### Required

- [x] Computer Agent Phase 0 automated tests exist and are part of CI.
- [x] Message Stop/cancellation behavior exists.
- [x] Retry preserves message identity and attachments.
- [x] Missing attachment restoration paths are hardened.
- [x] Conversation/project mutation errors are surfaced.
- [x] Connectivity stale-snapshot handling is hardened.
- [ ] Run all current automated tests on the exact candidate.
- [ ] Add/fix targeted regression tests for every defect discovered during physical E2E.
- [ ] Verify cancellation, retry, persistence and failure paths after any final code changes.

Any defect discovered in later layers that can be reproduced automatically should receive a regression test before closure where practical.

## Layer 3 — Integration, Security and Adversarial Verification

### Required

- [ ] Permission-denied flows do not crash or silently escalate.
  - Automated permission normalization now proves that native `denied` never maps to application `granted`; native OS denial/re-enable behavior remains a Layer 4 device test.
- [ ] Invalid/deleted conversation and project IDs fail safely.
  - Invalid project/notification route IDs are covered automatically; deleted-resource behavior remains part of device E2E.
- [x] Missing/corrupt attachments cannot escape expected storage boundaries.
- [x] Notification/deep-link route inputs are rejected when invalid.
- [x] Diagnostics never expose known credential patterns or raw sensitive values covered by the sanitizer regression suite.
- [x] Settings reset storage operation is scoped to application settings and does not delete conversations/projects/files.
- [x] Save Text Drafts off prevents text-draft persistence.
- [x] Retry preserves the logical user-message identity and message persistence uses ID-based upsert semantics.
- [ ] Offline/online transitions do not silently corrupt pending UI state.
- [ ] App restart does not create privilege/permission state inconsistent with OS state.
- [x] No production AI/provider key is intentionally present in repository or shipped Mobile composition; CI scans tracked history for common provider/private-key patterns.

Critical/High security or privacy defects block the section.

### Dependency review

The automated dependency gate blocks High/Critical production dependency advisories.

Current reviewed transitive Moderate advisories are not hidden:

- `uuid@7.0.3`, reached through Expo config tooling;
- `decode-uri-component@0.2.2`, reached through `expo-router -> query-string`.

They are tracked as non-blocking Moderate transitive findings while the project remains on the validated Expo 57 dependency graph. A forced override that breaks Expo compatibility is not accepted as a security fix.

The lint toolchain is pinned to `eslint@9.39.5` with `eslint-config-expo@57.0.2`. ESLint 10 was tested and rejected for this baseline because the Expo-supplied React lint plugin is not compatible with ESLint 10. The lint toolchain is development-only and must be upgraded when the Expo/React plugin chain supports ESLint 10 without disabling rules.

## Layer 4 — Physical Device / E2E / Recovery Verification

All applicable tests must be executed on a real supported Android device. Simulator-only evidence is insufficient for this layer.

Expo Go may be used for preliminary smoke testing only. Final freeze evidence must come from an app-owned Android build traceable to the exact tested commit. See `SECTION_01_ANDROID_DEVICE_RUNBOOK.md`.

The repository currently has no committed `eas.json` and no fixed `expo.android.package` application ID. A permanent Android package identifier must not be invented solely to make this gate pass; the owner-selected identity/build profile must be committed before final standalone-build evidence is accepted.

### Installation and Persistence

- [ ] Clean install launches successfully.
- [ ] Launch with existing database/user data succeeds.
- [ ] Force-close/restart preserves expected data.
- [ ] Device reboot preserves expected data/state.

### Lifecycle and Connectivity

- [ ] Background -> foreground works correctly.
- [ ] Wi-Fi -> cellular transition works.
- [ ] Cellular -> Wi-Fi transition works.
- [ ] Online -> offline -> online transition works.
- [ ] Real mobile-data test outside home Wi-Fi works.
- [ ] Connectivity diagnostics reflect real transitions.

### Permissions

- [ ] Microphone allow flow.
- [ ] Microphone deny flow.
- [ ] Permission retry after denial/re-enable.
- [ ] Camera/media/document permissions as applicable.
- [ ] Revoked OS permission is reflected correctly after returning to app.

### Attachments

- [ ] Camera/image attachment flow.
- [ ] Image/video picker flow.
- [ ] Document attachment flow.
- [ ] Attachment-only message.
- [ ] Text + attachment message.
- [ ] Missing attachment recovery.
- [ ] Remove draft attachment.
- [ ] Persistence across restart.

### Chat and Conversations

- [ ] Send message.
- [ ] Stop active message.
- [ ] Retry failed/stopped message.
- [ ] Create conversation.
- [ ] Open conversation.
- [ ] Search conversations.
- [ ] Pin/unpin.
- [ ] Archive/unarchive where supported.
- [ ] Delete conversation.
- [ ] Automatic title behavior.
- [ ] Draft restores when enabled.
- [ ] Text draft does not restore when Save Text Drafts is disabled.

### Projects

- [ ] Create project.
- [ ] Edit project.
- [ ] Archive project.
- [ ] Delete project.
- [ ] Add project file.
- [ ] Remove project file.
- [ ] Link conversation to project.
- [ ] Unlink conversation from project.
- [ ] Invalid/missing project route is handled safely.

### Notifications and Navigation

- [ ] Local notification delivery.
- [ ] Notification navigation.
- [ ] Invalid notification target fails safely.
- [ ] Deep-link behavior where supported.

### Settings and Accessibility

- [ ] Theme setting persists.
- [ ] Language setting persists.
- [ ] Runtime online/offline mode setting behaves correctly.
- [ ] Reduced Motion visibly removes/reduces configured transitions.
- [ ] Arabic RTL layout.
- [ ] German/English LTR layout.
- [ ] Mixed Arabic/German/English text direction.
- [ ] Primary controls have usable touch targets.
- [ ] Screen reader labels on primary flows are correct.

### Diagnostics and Storage Maintenance

- [ ] Core Health / Diagnostics screen loads.
- [ ] Refresh diagnostics works.
- [ ] Clear diagnostics works.
- [ ] Orphan-attachment cleanup removes only orphaned data.
- [ ] Settings reset confirmation appears.
- [ ] Settings reset preserves conversations/projects/files as promised.

### Voice Core

- [ ] Microphone recording starts/stops.
- [ ] Recorded audio can be played.
- [ ] Denied microphone permission fails gracefully.
- [ ] Recorder/player state survives normal lifecycle transitions safely.

### Recovery

- [ ] Force-close during ordinary use does not corrupt data.
- [ ] Restart after interrupted operation returns to a coherent state.
- [ ] Missing local attachment file presents unavailable state rather than crashing.
- [ ] Offline send/failure state remains understandable and recoverable.

Every failure is classified by severity and logged before retesting.

## Layer 5 — Final Release / Evidence Gate

### Required

- [ ] Every Layer 1 item passes on the final candidate.
- [ ] Every Layer 2 item passes on the final candidate.
- [ ] Every Layer 3 item passes on the final candidate.
- [ ] Every mandatory Layer 4 item passes on the physical device.
- [ ] All blocker/critical defects are closed.
- [ ] All high-severity defects affecting the freeze scope are closed or formally reviewed with written evidence.
- [ ] Final TypeScript pass.
- [ ] Final Expo Doctor pass.
- [ ] Final Computer Agent Phase 0 test pass.
- [ ] Final repository secret scan.
- [ ] GitHub Actions green on the exact candidate commit.
- [ ] `MUDRIK_STATUS.md` updated with final evidence.
- [ ] Freeze commit SHA recorded.
- [ ] `MOBILE-CORE-FROZEN` tag created only after all previous items pass.

## Defect Record Format

For every discovered defect record:

- ID;
- date;
- test case;
- severity;
- reproduction steps;
- expected result;
- actual result;
- logs/diagnostics reference with sensitive values removed;
- root cause;
- fix commit;
- regression test/evidence;
- retest result.

## Closure Rule

Section 01 closes only when the checklist is complete and the freeze tag exists.

Until then, future platform capabilities may be specified/documented but must not be coupled into the Mobile Core runtime.
