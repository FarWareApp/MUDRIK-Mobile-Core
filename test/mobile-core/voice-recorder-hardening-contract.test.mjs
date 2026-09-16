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
    assert.match(
      controller,
      /recordingSessionPrepared = true;/,
    );
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
  'voice recorder releases active capture and audio mode when its screen unmounts',
  () => {
    assert.match(
      controller,
      /currentPhase === 'recording' \|\|\s*currentPhase === 'paused'/,
    );
    assert.match(
      controller,
      /recordingIsActive &&\s*operationRef\.current !== 'stop'/,
    );
    assert.match(
      controller,
      /void recorder\.stop\(\)\s*\.catch\(\(\) => undefined\);/,
    );
    assert.match(
      controller,
      /void restorePlayback\(\);/,
    );
  },
);
