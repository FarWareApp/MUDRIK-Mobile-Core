import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const controller = fs.readFileSync(
  'src/features/voice/hooks/useVoiceRecorderController.ts',
  'utf8',
);

test(
  'voice recorder serializes start and stop operations before React state can race',
  () => {
    assert.match(
      controller,
      /const operationRef = useRef<RecorderOperation \| null>\(null\)/,
    );
    assert.match(
      controller,
      /operationRef\.current = 'start'/,
    );
    assert.match(
      controller,
      /operationRef\.current = 'stop'/,
    );

    const operationGuards = controller.match(
      /operationRef\.current \|\|/g,
    ) ?? [];

    assert.ok(operationGuards.length >= 4);
  },
);

test(
  'voice recorder blocks async state commits after screen unmount',
  () => {
    assert.match(
      controller,
      /const mountedRef = useRef\(true\)/,
    );
    assert.match(
      controller,
      /mountedRef\.current = false/,
    );
    assert.match(
      controller,
      /if \(mountedRef\.current\) \{\s*setPermission\(status\);/,
    );

    const mountedGuards = controller.match(
      /!mountedRef\.current/g,
    ) ?? [];

    assert.ok(mountedGuards.length >= 5);
  },
);

test(
  'voice recorder restores playback before reporting a missing recording URI',
  () => {
    const stopStart = controller.indexOf(
      'const stop = useCallback(async () => {',
    );
    const stopBody = controller.slice(stopStart);
    const nativeStop = stopBody.indexOf(
      'await recorder.stop();',
    );
    const playbackRestore = stopBody.indexOf(
      'await audioSession.preparePlayback();',
    );
    const missingUri = stopBody.indexOf(
      'if (!uri)',
    );

    assert.notEqual(stopStart, -1);
    assert.ok(nativeStop >= 0);
    assert.ok(playbackRestore > nativeStop);
    assert.ok(missingUri > playbackRestore);
  },
);

test(
  'voice recorder restores playback after start and stop failures',
  () => {
    assert.match(
      controller,
      /let recordingSessionPrepared = false;/,
    );

    const preparedFlag = controller.indexOf(
      'recordingSessionPrepared = true;',
    );
    const prepareRecording = controller.indexOf(
      'await audioSession.prepareRecording();',
    );

    assert.ok(preparedFlag >= 0);
    assert.ok(prepareRecording > preparedFlag);
    assert.match(
      controller,
      /catch \{\s*if \(recordingSessionPrepared\) \{\s*await restorePlayback\(\);/,
    );

    const restoreCalls = controller.match(
      /await restorePlayback\(\);/g,
    ) ?? [];

    assert.ok(restoreCalls.length >= 4);
  },
);

test(
  'voice recorder releases active capture before restoring audio mode on unmount',
  () => {
    assert.match(
      controller,
      /if \(operationRef\.current === 'stop'\) \{\s*return;/,
    );
    assert.match(
      controller,
      /currentPhase === 'recording' \|\|\s*currentPhase === 'paused'/,
    );

    const cleanupStart = controller.indexOf(
      'if (recordingIsActive) {',
    );
    const cleanupBody = controller.slice(cleanupStart);
    const nativeStop = cleanupBody.indexOf(
      'await recorder.stop();',
    );
    const playbackRestore = cleanupBody.indexOf(
      'await restorePlayback();',
    );

    assert.notEqual(cleanupStart, -1);
    assert.ok(nativeStop >= 0);
    assert.ok(playbackRestore > nativeStop);
    assert.match(
      cleanupBody,
      /catch \{[\s\S]*?await restorePlayback\(\);/,
    );
  },
);
