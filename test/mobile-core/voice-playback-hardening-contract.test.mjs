import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const player = fs.readFileSync(
  'src/features/voice/components/VoiceRecordingPlayer.tsx',
  'utf8',
);
const controller = fs.readFileSync(
  'src/features/voice/hooks/useVoicePlaybackController.ts',
  'utf8',
);

test(
  'voice playback presentation delegates native lifecycle responsibility to a controller',
  () => {
    assert.match(
      player,
      /useVoicePlaybackController\(uri\)/,
    );
    assert.doesNotMatch(
      player,
      /from 'expo-audio'/,
    );
    assert.doesNotMatch(
      player,
      /const toggle = async/,
    );

    assert.match(
      controller,
      /useAudioPlayer\(uri\)/,
    );
    assert.match(
      controller,
      /useAudioPlayerStatus\(player\)/,
    );
  },
);

test(
  'voice playback serializes toggle operations and refuses playback before the source is loaded',
  () => {
    assert.match(
      controller,
      /const operationRef = useRef<PlaybackOperation \| null>\(null\)/,
    );
    assert.match(
      controller,
      /operationRef\.current \|\|\s*!status\.isLoaded/,
    );
    assert.match(
      controller,
      /operationRef\.current = 'toggle'/,
    );
    assert.match(
      controller,
      /if \(operationRef\.current === 'toggle'\) \{\s*operationRef\.current = null;/,
    );
  },
);

test(
  'voice playback restarts completed audio before playing and guards the async seek boundary',
  () => {
    assert.match(
      controller,
      /status\.didJustFinish/,
    );
    assert.match(
      controller,
      /status\.currentTime >= status\.duration/,
    );

    const seek = controller.indexOf(
      'await player.seekTo(0);',
    );
    const mountedGuard = controller.indexOf(
      '!mountedRef.current',
      seek,
    );
    const play = controller.indexOf(
      'player.play();',
      seek,
    );

    assert.ok(seek >= 0);
    assert.ok(mountedGuard > seek);
    assert.ok(play > mountedGuard);
  },
);

test(
  'voice playback contains native failures and never promotes raw platform errors into app state',
  () => {
    assert.match(
      controller,
      /catch \{[\s\S]*?status\.error/,
    );
    assert.match(
      controller,
      /hasError: Boolean\(status\.error\)/,
    );
    assert.doesNotMatch(
      controller,
      /setError\(/,
    );
    assert.doesNotMatch(
      controller,
      /console\.(?:log|warn|error)/,
    );
  },
);

test(
  'voice playback exposes loading and seek state to accessible controls',
  () => {
    assert.match(
      controller,
      /isBusy:[\s\S]*?!status\.isLoaded[\s\S]*?status\.isBuffering[\s\S]*?isSeeking/,
    );
    assert.match(
      controller,
      /isDisabled:[\s\S]*?!status\.isLoaded[\s\S]*?isSeeking/,
    );
    assert.match(
      player,
      /accessibilityState=\{\{\s*busy: isBusy,\s*disabled: isDisabled,/,
    );
    assert.match(
      player,
      /disabled=\{isDisabled\}/,
    );
  },
);
