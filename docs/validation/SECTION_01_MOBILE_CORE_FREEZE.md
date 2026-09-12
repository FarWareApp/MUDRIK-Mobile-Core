# Section 01 — Mobile Core Freeze Validation

## Status

`ACTIVE`

Section 01 is the only active implementation section under `MUDRIK_20_SECTION_EXECUTION_PLAN.md`.

The section cannot close until all five validation layers pass and the physical-device evidence is complete.

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
- [ ] Invalid/deleted conversation and project IDs fail safely.
- [ ] Missing/corrupt attachments cannot escape expected storage boundaries.
- [ ] Notification/deep-link route inputs are rejected when invalid.
- [ ] Diagnostics never expose secrets or raw sensitive values.
- [ ] Settings reset does not delete conversations/projects/files unexpectedly.
- [ ] Save Text Drafts off prevents text-draft persistence.
- [ ] Repeated send/retry actions do not create unintended duplicate logical messages.
- [ ] Offline/online transitions do not silently corrupt pending UI state.
- [ ] App restart does not create privilege/permission state inconsistent with OS state.
- [ ] No production AI/provider key exists in repository or shipped configuration.

Critical/High security or privacy defects block the section.

## Layer 4 — Physical Device / E2E / Recovery Verification

All applicable tests must be executed on a real supported Android device. Simulator-only evidence is insufficient for this layer.

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
