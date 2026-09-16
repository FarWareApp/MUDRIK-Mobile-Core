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

The rapid implementation sequence cancelled an intermediate CodeQL run under the workflow's branch-level `cancel-in-progress` policy. The subsequent stable hardening evidence head `61b255a252ff71557df6bd3f04e7f89b1fe5bb54` passed both Mobile Core Validation and CodeQL with the voice playback changes present.

## Accessibility and Reduced Effects

Accessibility system-observation hardening is present on commit `735ca7bae3592cb8268a5d825ac63a5fd5a99308`.

Key controls:

- native accessibility observation is isolated in `useSystemAccessibilityState.ts` while `AccessibilityProvider.tsx` remains context/composition-only;
- `isReduceMotionEnabled()` and `isReduceTransparencyEnabled()` have explicit rejection paths, preventing unhandled native query rejections;
- failed native preference reads conservatively fall back to reduced motion/transparency;
- async native query commits are mounted-guarded;
- subscriptions are removed on cleanup;
- reduced-transparency observation remains iOS-only while reduced motion remains cross-platform;
- native-event revisions prevent an older initial query result from overwriting a newer system accessibility event;
- the existing design runtime contract was updated to verify native observation in the dedicated observer without weakening the public provider contract;
- focused regression coverage exists in `test/mobile-core/accessibility-hardening-contract.test.mjs`.

Validation on that exact implementation commit:

- Mobile Core Validation run `35092776523`: PASS;
- CodeQL Security Analysis run `35092776645`: PASS;
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

## Localization and RTL/LTR

Localization and directionality hardening is present on validated implementation head `f49a1d9ff5a36c6a2b574203f2c59570d091b377`.

Key controls:

- system-locale observation is isolated in `useResolvedAppLocale.ts` while `LocaleProvider.tsx` remains context/composition-only;
- Android system-locale changes are re-read when the application returns to the active foreground state;
- the Android `AppState` subscription is removed during cleanup;
- explicit Arabic, German, or English preferences bypass system-locale observation;
- `resolveSystemLocale.ts` contains locale normalization and a safe English fallback if native locale resolution throws;
- RTL remains declarative (`locale === 'ar'`) and is applied centrally through `AppDirectionBoundary.tsx` rather than forcing native direction globally;
- no `I18nManager.forceRTL`/`allowRTL` mutation was introduced;
- the error-recovery contract was aligned with the dedicated locale-resolution hook so the contract protects behavior without coupling native observation back into the provider;
- focused regression coverage exists in `test/mobile-core/localization-hardening-contract.test.mjs`.

Validation on that exact implementation head:

- Mobile Core Validation run `35117522183`: PASS;
- CodeQL Security Analysis run `35117522237`: PASS;
- frozen dependency install: PASS;
- dependency reproducibility: PASS;
- Android configuration gate: PASS;
- tracked sensitive-file gate: PASS;
- full Git-history secret scan: PASS;
- High/Critical dependency audit gate: PASS;
- reviewed advisory dependency paths: PASS;
- ESLint: PASS;
- TypeScript: PASS;
- Mobile Core security regression tests: PASS;
- Expo Doctor: PASS;
- Computer Agent Phase 0 tests: PASS.

## Lifecycle

Lifecycle observation hardening is present on validated implementation head `ef847cf38fdadfcb265cad2cd8301cb5cbf33cc7`.

Key controls:

- native `AppState` observation is isolated in `useSystemLifecycleState.ts` while `LifecycleProvider.tsx` remains context/composition-only;
- lifecycle phase mapping is isolated in the pure `AppLifecyclePhaseResolver.ts` helper;
- the native observer subscribes before reconciling `AppState.currentState`, closing the render-to-effect missed-transition window;
- duplicate native lifecycle events are ignored and therefore do not advance `lastChangedAt` or emit duplicate transition diagnostics;
- real lifecycle transitions advance `lastChangedAt` with a transition timestamp;
- the native `AppState` subscription is removed on cleanup;
- lifecycle diagnostics remain bounded to stable app-state labels rather than raw platform error content;
- the public lifecycle context contract (`appState`, `phase`, `isForeground`, `lastChangedAt`) is preserved;
- focused regression coverage exists in `test/mobile-core/lifecycle-hardening-contract.test.mjs`.

Validation on that exact implementation head:

- Mobile Core Validation run `35118220910`: PASS;
- CodeQL Security Analysis run `35118220803`: PASS;
- frozen dependency install: PASS;
- dependency reproducibility: PASS;
- Android configuration gate: PASS;
- tracked sensitive-file gate: PASS;
- full Git-history secret scan: PASS;
- High/Critical dependency audit gate: PASS;
- reviewed advisory dependency paths: PASS;
- ESLint: PASS;
- TypeScript: PASS;
- Mobile Core security regression tests: PASS;
- Expo Doctor: PASS;
- Computer Agent Phase 0 tests: PASS.

## Permissions

Permission hardening is present on validated implementation head `9422ab913b85beaa3f643f263b76c181091a65df`.

Key controls:

- permission refresh, request and system-settings operations are serialized with independent locks;
- mounted and service-revision guards prevent stale asynchronous permission results from mutating state after unmount or dependency replacement;
- stale operations cannot release locks owned by a newer service revision;
- a permission request result is accepted only when its returned permission ID matches the requested ID;
- native permission `canAskAgain` capability is treated as an explicit boolean rather than using an optimistic fallback;
- native permission request routing is exhaustive for microphone, camera, media library and notifications;
- permanent denial (`canAskAgain === false`) exposes an app-settings recovery action through the dedicated `PermissionSettingsService` abstraction;
- native `Linking.openSettings()` is isolated inside `NativePermissionSettingsService` and is not leaked into settings UI components;
- permission state is refreshed through the lifecycle layer when the application returns to the active foreground state after system settings;
- request/settings actions share accessible busy-state semantics while remaining distinguishable internally;
- caught native failures are reduced to stable typed error codes without promoting raw platform error strings;
- focused regression coverage exists in `test/mobile-core/permissions-hardening-contract.test.mjs` and `test/mobile-core/settings-hardening-contract.test.mjs`.

Validation on that exact implementation head:

- Mobile Core Validation run `35123778567`: PASS;
- CodeQL Security Analysis run `35123778580`: PASS;
- frozen dependency install: PASS;
- dependency reproducibility: PASS;
- Android configuration gate: PASS;
- tracked sensitive-file gate: PASS;
- full Git-history secret scan: PASS;
- High/Critical dependency audit gate: PASS;
- reviewed advisory dependency paths: PASS;
- ESLint: PASS;
- TypeScript: PASS;
- Mobile Core security regression tests: PASS;
- Expo Doctor: PASS;
- Computer Agent Phase 0 tests: PASS.

Physical verification of real permission prompts, permanent-denial transitions, app-settings navigation and returning from system settings remains part of the mandatory Layer 4 device matrix.

## Remaining Gate

This evidence is pre-device only. Section 01 remains open until the real Android Layer 4 matrix is executed and the exact freeze candidate passes all final automated and security gates. In particular, microphone recording/playback, lifecycle behavior, accessibility/reduced-motion behavior, RTL/LTR behavior, permissions, notifications and other hardware/OS-dependent paths still require physical-device verification before `MOBILE-CORE-FROZEN` can be created.
