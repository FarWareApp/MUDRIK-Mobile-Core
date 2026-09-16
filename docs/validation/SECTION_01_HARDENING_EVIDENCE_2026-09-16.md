# Section 01 — Mobile Core Hardening Evidence — 2026-09-16

## Scope

This evidence record captures targeted pre-device hardening performed inside the active Section 01 Mobile Core freeze surface. It does not close Section 01 and does not replace the mandatory physical-device Layer 4 matrix.

The work remains app-first and does not introduce production AI/provider coupling into the Mobile UI.

## Notifications

Targeted notification hardening completed before this record:

- response consumption is serialized;
- a notification response is cleared only after the service/native clear operation succeeds;
- a newer response is not erased by completion of an older consume operation;
- valid navigation targets are consumed only after navigation succeeds;
- navigation failures preserve the response for retry/recovery;
- diagnostics avoid raw notification identifiers;
- failure state uses stable typed codes.

The Expo SDK 57 patch dependency alignment required by Expo Doctor was completed without an SDK 58 migration.

## Connectivity

Targeted connectivity hardening completed before this record:

- subscription is established before the initial refresh;
- refresh results are guarded by request identity and snapshot revision;
- stale refresh success cannot overwrite a newer subscription snapshot;
- stale refresh failure cannot create a false error after newer valid state arrives;
- failure state uses a stable typed code;
- raw caught error messages are not emitted into diagnostics.

## Voice Recorder

Voice recorder lifecycle hardening is present on commit `e9d1df0bf7eb990da1f03a7f8310ac1679c83a8c`.

Key controls:

- asynchronous start/stop operations are serialized;
- async completions are guarded after unmount;
- recording-mode preparation failures restore playback mode on a best-effort basis;
- stop restores playback mode before reporting a missing recording URI;
- unmount cleanup stops active capture before restoring playback mode;
- active cleanup does not race an already-running stop operation;
- regression coverage exists in `test/mobile-core/voice-recorder-hardening-contract.test.mjs`.

Validation on that exact commit:

- Mobile Core Validation run `35075745201`: PASS;
- CodeQL Security Analysis on the same head: PASS;
- frozen dependency install: PASS;
- dependency reproducibility: PASS;
- Android configuration gate: PASS;
- tracked sensitive-file gate: PASS;
- full Git-history secret scan: PASS;
- High/Critical dependency audit gate: PASS;
- ESLint: PASS;
- TypeScript: PASS;
- Mobile Core regression tests: PASS;
- Expo Doctor: PASS;
- Computer Agent Phase 0 tests: PASS.

## Voice Playback

Voice playback hardening is present on commit `0da4b873f1667bc666e3d1e735adb97fee2e06ec`.

Key controls:

- native playback lifecycle logic is isolated from `VoiceRecordingPlayer.tsx` into `useVoicePlaybackController.ts`;
- playback toggle operations are serialized;
- playback is refused until the source reports loaded;
- completed audio seeks to zero before replay;
- the async seek boundary checks mounted state before calling play;
- native playback failures are contained without promoting raw platform error strings into app state or diagnostics;
- loading/seeking state is exposed to the accessible control through disabled/busy state;
- regression coverage exists in `test/mobile-core/voice-playback-hardening-contract.test.mjs`.

Validation on that exact implementation commit:

- Mobile Core Validation run `35092036537`: PASS;
- frozen dependency install: PASS;
- dependency reproducibility: PASS;
- Android configuration gate: PASS;
- tracked sensitive-file gate: PASS;
- full Git-history secret scan: PASS;
- High/Critical dependency audit gate: PASS;
- ESLint: PASS;
- TypeScript: PASS;
- Mobile Core regression tests: PASS;
- Expo Doctor: PASS;
- Computer Agent Phase 0 tests: PASS.

The CodeQL run created during the rapid sequence of playback commits was cancelled by the workflow's branch-level `cancel-in-progress` concurrency policy. This evidence-only commit intentionally leaves the branch stable so the exact final documentation head can receive a fresh CodeQL result.

## Remaining Gate

This evidence is pre-device only. Section 01 remains open until the real Android Layer 4 matrix is executed and the exact freeze candidate passes all final automated and security gates. In particular, microphone recording/playback and lifecycle behavior still require physical-device verification before `MOBILE-CORE-FROZEN` can be created.
