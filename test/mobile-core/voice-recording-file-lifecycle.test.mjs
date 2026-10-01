import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const controller = fs.readFileSync(
  'src/features/voice/hooks/useVoiceRecorderController.ts',
  'utf8',
);
const fileStore = fs.readFileSync(
  'src/features/voice/storage/VoiceRecordingFileStore.ts',
  'utf8',
);
const screen = fs.readFileSync(
  'src/features/voice/VoiceScreen.tsx',
  'utf8',
);
const types = fs.readFileSync(
  'src/features/voice/types.ts',
  'utf8',
);
const translations = fs.readFileSync(
  'src/core/localization/voiceTranslations.ts',
  'utf8',
);

test(
  'voice file store only owns expo-audio recording files inside the platform recording directory',
  () => {
    assert.match(
      fileStore,
      /Paths\.document/,
    );
    assert.match(
      fileStore,
      /Platform\.OS === 'ios'\s*\? 'ExpoAudio'\s*:\s*'Audio'/,
    );
    assert.match(
      fileStore,
      /RECORDING_FILE_NAME/,
    );
    assert.match(
      fileStore,
      /recording-\[0-9a-f\]/,
    );
    assert.match(
      fileStore,
      /Refusing unmanaged voice recording URI/,
    );
    assert.match(
      fileStore,
      /file\.exists/,
    );
    assert.match(
      fileStore,
      /file\.delete\(\)/,
    );
    assert.match(
      fileStore,
      /URL\.revokeObjectURL\(uri\)/,
    );
  },
);

test(
  'voice draft discard deletes the owned recording before removing UI state',
  () => {
    const discardStart = controller.indexOf(
      'const discard = useCallback(() => {',
    );
    const discardBody =
      controller.slice(discardStart);

    assert.ok(discardStart >= 0);
    assert.match(
      discardBody,
      /recordingFileStore\.delete\(\s*currentDraft\.uri/,
    );

    const nativeDelete = discardBody.indexOf(
      'recordingFileStore.delete',
    );
    const clearDraft = discardBody.indexOf(
      'setDraft(null)',
    );

    assert.ok(nativeDelete >= 0);
    assert.ok(clearDraft > nativeDelete);
    assert.match(
      discardBody,
      /recording-delete-failed/,
    );
  },
);

test(
  'starting another recording removes the previous draft and unlocks after cleanup failure',
  () => {
    const startIndex = controller.indexOf(
      'const start = useCallback(async () => {',
    );
    const stopIndex = controller.indexOf(
      'const pause = useCallback',
    );
    const startBody = controller.slice(
      startIndex,
      stopIndex,
    );

    assert.match(
      startBody,
      /const currentDraft =\s*draftRef\.current/,
    );
    assert.match(
      startBody,
      /deleteRecordingFile\(\s*currentDraft\.uri/,
    );
    assert.match(
      startBody,
      /recording-delete-failed/,
    );
    assert.match(
      startBody,
      /operationRef\.current = null;\s*return;/,
    );
  },
);

test(
  'voice unmount and unmounted stop paths clean private recording files',
  () => {
    assert.match(
      controller,
      /const nativeStatus = recorder\.getStatus\(\)/,
    );
    assert.match(
      controller,
      /deleteRecordingFile\(\s*recorder\.getStatus\(\)\.url/,
    );
    assert.match(
      controller,
      /const currentDraft =\s*draftRef\.current/,
    );

    const stopStart = controller.indexOf(
      'const stop = useCallback(async () => {',
    );
    const stopBody = controller.slice(stopStart);

    assert.match(
      stopBody,
      /if \(!mountedRef\.current\) \{\s*deleteRecordingFile\(uri\);\s*return;/,
    );
  },
);

test(
  'voice delete failure is a localized stable error instead of a false success',
  () => {
    assert.match(
      types,
      /'recording-delete-failed'/,
    );
    assert.match(
      screen,
      /voiceRecordingDeleteFailed/,
    );

    const occurrences =
      translations.match(
        /^\s*voiceRecordingDeleteFailed:/gm,
      ) ?? [];

    assert.equal(
      occurrences.length,
      3,
    );
  },
);
