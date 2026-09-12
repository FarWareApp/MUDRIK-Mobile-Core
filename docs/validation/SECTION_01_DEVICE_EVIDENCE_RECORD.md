# Section 01 — Android Device Evidence Record

Status: NOT STARTED

This record is the authoritative physical-device evidence package for `MOBILE-CORE-FROZEN`.

## Candidate Identity

- Candidate SHA:
- Branch: `mudrik-core-v1`
- App version:
- Android package ID:
- EAS build profile: `device-validation`
- Build artifact ID / URL reference:
- APK checksum if recorded:
- Device model:
- Android version:
- Installation method:
- Tester:
- Test date/time:
- Wi-Fi available: yes/no
- Cellular data available: yes/no

The tested APK must map to the exact Candidate SHA above.

## Automated Preflight Evidence

- [ ] `node scripts/section01-device-preflight.mjs` PASS
- [ ] GitHub Actions green on exact Candidate SHA
- [ ] Frozen install PASS
- [ ] Reproducibility gate PASS
- [ ] Tracked sensitive-file gate PASS
- [ ] Full Git-history secret scan PASS
- [ ] Dependency High/Critical gate PASS
- [ ] ESLint PASS
- [ ] TypeScript PASS
- [ ] Mobile Core regression suite PASS
- [ ] Expo Doctor PASS
- [ ] Computer Agent Phase 0 tests PASS

## Physical Test Results

Use `PASS`, `FAIL`, or `BLOCKED`. Every FAIL must reference a defect ID.

| ID | Test | Result | Evidence / Defect |
|---|---|---|---|
| A01 | Clean install and first launch |  |  |
| A02 | Existing data launch |  |  |
| A03 | Force-stop/relaunch persistence |  |  |
| A04 | Device reboot persistence |  |  |
| B01 | Background -> foreground |  |  |
| B02 | Wi-Fi -> cellular |  |  |
| B03 | Cellular -> Wi-Fi |  |  |
| B04 | Online -> offline -> online |  |  |
| B05 | Real cellular test away from home Wi-Fi |  |  |
| B06 | Connectivity diagnostics accuracy |  |  |
| C01 | Microphone allow |  |  |
| C02 | Microphone deny |  |  |
| C03 | Microphone re-enable from Android Settings |  |  |
| C04 | Camera/media/document permission flows |  |  |
| C05 | Revoked permission reflected after returning |  |  |
| D01 | Camera capture attachment |  |  |
| D02 | Photo/video picker |  |  |
| D03 | Document picker |  |  |
| D04 | Attachment-only message |  |  |
| D05 | Text + attachment message |  |  |
| D06 | Remove draft attachment |  |  |
| D07 | Attachment persistence across restart |  |  |
| D08 | Missing attachment recovery |  |  |
| E01 | Send message |  |  |
| E02 | Stop active send |  |  |
| E03 | Retry failed/stopped send |  |  |
| E04 | Retry preserves logical identity/no duplicate |  |  |
| E05 | Create/open/search conversation |  |  |
| E06 | Pin/unpin |  |  |
| E07 | Archive/unarchive |  |  |
| E08 | Delete conversation |  |  |
| E09 | Automatic title |  |  |
| E10 | Draft restore enabled |  |  |
| E11 | Save Text Drafts off survives restart correctly |  |  |
| F01 | Create/edit/archive/delete project |  |  |
| F02 | Add/remove project file |  |  |
| F03 | Link/unlink conversation |  |  |
| F04 | Invalid/deleted project route safe failure |  |  |
| G01 | Local notification delivery |  |  |
| G02 | Valid notification navigation |  |  |
| G03 | Invalid notification target rejection |  |  |
| G04 | Invalid project ID rejection |  |  |
| G05 | Deep-link behavior |  |  |
| H01 | Theme persistence |  |  |
| H02 | Language persistence |  |  |
| H03 | Runtime online/offline mode |  |  |
| H04 | Reduced Motion |  |  |
| H05 | Arabic RTL |  |  |
| H06 | German/English LTR |  |  |
| H07 | Mixed Arabic/German/English direction |  |  |
| H08 | Primary touch targets |  |  |
| H09 | Screen-reader labels |  |  |
| I01 | Core Health screen |  |  |
| I02 | Refresh diagnostics |  |  |
| I03 | Clear diagnostics |  |  |
| I04 | No sensitive value leakage observed |  |  |
| I05 | Orphan cleanup removes only orphaned data |  |  |
| I06 | Settings reset confirmation |  |  |
| I07 | Settings reset preserves conversations/projects/files |  |  |
| J01 | Recording start/stop |  |  |
| J02 | Recorded audio playback |  |  |
| J03 | Denied microphone failure is graceful |  |  |
| J04 | Recorder/player lifecycle coherence |  |  |
| J05 | Voice interruption/cancellation recovery |  |  |
| K01 | Force-stop during ordinary use |  |  |
| K02 | Restart after interrupted operation |  |  |
| K03 | Offline send failure/recovery |  |  |
| K04 | Missing attachment remains non-crashing |  |  |
| K05 | Rapid send/retry taps do not duplicate state |  |  |
| K06 | Invalid/deleted routes remain contained |  |  |

## Defects

For every defect record:

- Defect ID:
- Severity:
- Test ID:
- Reproduction:
- Expected:
- Observed:
- Sanitized evidence:
- Root cause:
- Fix SHA:
- Regression test:
- Retest result:

Known closed pre-device defect:

- `S01-DATA-001` — High — project-only attachment could be misclassified as orphan; fixed and covered by regression test before physical testing.

## Final Layer 5 Decision

- [ ] All mandatory physical cases PASS
- [ ] No Blocker/Critical defects remain
- [ ] No unresolved High defects in freeze scope
- [ ] Final automated validation rerun on exact candidate
- [ ] GitHub Actions green on exact candidate
- [ ] `MUDRIK_STATUS.md` updated with evidence
- [ ] Freeze SHA recorded
- [ ] `MOBILE-CORE-FROZEN` tag created

Final decision: NOT READY
