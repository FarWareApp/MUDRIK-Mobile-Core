# Section 01 — Android Physical Device Validation Runbook

## Purpose

This runbook defines the mandatory physical-device evidence required before `MOBILE-CORE-FROZEN` can be created.

The automated CI gate is necessary but not sufficient. Device-only behavior must be verified on the exact candidate commit that will be frozen.

## Final-build rule

The final freeze evidence must come from an app-owned Android build produced from this repository.

Expo Go may be used for preliminary smoke testing, but Expo Go evidence alone is not sufficient to close Layer 4 because permissions, notifications, native configuration, lifecycle behavior, file handling and release packaging can differ from an app-owned build.

At the time this runbook was added, the repository did not yet contain a committed `eas.json` or a fixed `expo.android.package` value. Do not invent a permanent Android application ID only to satisfy this gate. The owner-selected application ID and build profile must be committed before final standalone-build validation.

## Candidate identity

Record all of the following before testing:

- Git commit SHA;
- branch;
- build artifact identifier/version;
- build mode (`development`, `preview`, or release-equivalent);
- Android device model;
- Android OS version;
- installation method;
- test date/time;
- tester;
- Wi-Fi network available: yes/no;
- cellular data available: yes/no.

If the tested binary cannot be traced to the exact candidate SHA, the run is invalid.

## Automated preflight

Run against the exact candidate before installing the device build:

```bash
yarn install --frozen-lockfile --non-interactive
yarn lint
yarn typecheck
node --test test/mobile-core/*.test.mjs
npx --yes expo-doctor@1.20.4
node --test computer-agent/test/*.test.mjs
```

GitHub Actions must also be green for the same commit.

## Evidence rules

For every device test record:

- test ID;
- candidate SHA;
- PASS / FAIL / BLOCKED;
- short reproduction steps;
- expected behavior;
- observed behavior;
- sanitized screenshot/log reference when useful;
- defect ID if failed;
- retest result after a fix.

Never attach API keys, auth tokens, private messages, personal documents, raw account identifiers or other sensitive content to diagnostics or validation evidence.

## Severity

- **Blocker** — app cannot install/start, data corruption, unrecoverable crash, freeze cannot proceed.
- **Critical** — security/privacy boundary failure, unauthorized access, secret exposure, destructive data loss.
- **High** — major core workflow failure with no safe recovery.
- **Medium** — important workflow degradation with a safe workaround.
- **Low** — cosmetic/minor issue that does not compromise core behavior.

Blocker/Critical defects always stop the freeze. High defects affecting freeze scope must be fixed or explicitly reviewed with written evidence.

## Test matrix

### A. Installation and persistence

1. Clean install and first launch.
2. Create representative conversations/projects/settings.
3. Force-stop and relaunch.
4. Reboot Android and relaunch.
5. Confirm expected data remains coherent.

### B. Lifecycle and connectivity

1. Foreground -> background -> foreground.
2. Wi-Fi -> cellular while the app remains installed and usable.
3. Cellular -> Wi-Fi.
4. Online -> airplane/offline -> online.
5. Real cellular-data test away from the home Wi-Fi path.
6. Verify diagnostics reflect actual connectivity changes without stale state corruption.

### C. Permissions

For microphone, camera, media library and notifications where applicable:

1. Allow flow.
2. Deny flow.
3. Deny with `Don't ask again`/equivalent where Android exposes it.
4. Re-enable permission from Android Settings.
5. Return to MUDRIK and verify the OS state is re-read correctly.
6. Confirm no denied permission is silently treated as granted.

### D. Attachments

1. Camera capture.
2. Photo/video picker.
3. Document picker.
4. Attachment-only message.
5. Text + attachment message.
6. Remove draft attachment.
7. Restart with persisted attachment state.
8. Simulate/remove a local attachment file and verify unavailable-state recovery instead of crash.

### E. Chat and conversations

1. Send.
2. Stop active send.
3. Retry a failed/stopped send.
4. Verify retry does not create an unintended duplicate logical user message.
5. Create/open/search conversations.
6. Pin/unpin.
7. Archive/unarchive where supported.
8. Delete.
9. Automatic title behavior.
10. Draft restore enabled.
11. `Save text drafts` disabled: text must not restore after restart.

### F. Projects

1. Create/edit/archive/delete project.
2. Add/remove project file.
3. Link/unlink conversation.
4. Open an invalid/deleted project route and verify safe failure.

### G. Notifications and navigation

1. Local notification delivery.
2. Valid notification navigation.
3. Invalid target rejection.
4. Invalid project ID rejection.
5. Deep-link behavior where supported.

### H. Settings, localization and accessibility

1. Theme persists.
2. Language persists.
3. Runtime online/offline mode behaves coherently.
4. Reduced Motion visibly reduces configured transitions.
5. Arabic RTL.
6. German/English LTR.
7. Mixed Arabic/German/English direction.
8. Primary touch targets are usable.
9. Primary screen-reader labels are meaningful and correct.

### I. Diagnostics and storage maintenance

1. Core Health screen loads.
2. Refresh diagnostics.
3. Clear diagnostics.
4. Confirm sensitive values are not exposed.
5. Orphan attachment cleanup removes only orphaned managed data.
6. Settings reset confirmation appears.
7. Settings reset preserves conversations, projects and files.

### J. Voice core

1. Microphone recording starts/stops.
2. Recorded audio playback works.
3. Denied microphone permission fails gracefully.
4. Background/foreground transition does not leave recorder/player in an incoherent state.
5. Interruption and cancellation leave the screen recoverable.

### K. Recovery/adversarial checks

1. Force-stop during ordinary use and relaunch.
2. Restart after interrupted operation.
3. Offline send failure remains understandable/recoverable.
4. Missing local attachment remains non-crashing.
5. Rapid repeated taps on send/retry do not create duplicate logical state.
6. Invalid/deleted route targets do not escape expected screens.

## Defect/retest loop

For every failure:

1. classify severity;
2. capture sanitized evidence;
3. reproduce consistently when possible;
4. add an automated regression test when the defect can be reproduced outside the physical device;
5. fix;
6. rerun automated CI;
7. rerun the failed physical case;
8. rerun adjacent affected cases.

## Freeze decision

`MOBILE-CORE-FROZEN` may be created only when:

- the tested binary maps to the exact freeze candidate SHA;
- automated CI is green on that SHA;
- every mandatory physical case is PASS;
- no Blocker/Critical defect remains;
- High defects in freeze scope are closed or formally reviewed;
- final evidence is recorded in the Section 01 validation record.
