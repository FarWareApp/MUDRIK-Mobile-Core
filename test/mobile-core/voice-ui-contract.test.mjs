import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const screen = fs.readFileSync(
  'src/features/voice/VoiceScreen.tsx',
  'utf8',
);
const controller = fs.readFileSync(
  'src/features/voice/hooks/useVoiceRecorderController.ts',
  'utf8',
);
const controls = fs.readFileSync(
  'src/features/voice/components/VoiceRecorderControls.tsx',
  'utf8',
);
const player = fs.readFileSync(
  'src/features/voice/components/VoiceRecordingPlayer.tsx',
  'utf8',
);
const formatter = fs.readFileSync(
  'src/features/voice/formatters/formatVoiceDuration.ts',
  'utf8',
);
const voiceTranslations = fs.readFileSync(
  'src/core/localization/voiceTranslations.ts',
  'utf8',
);
const catalog = fs.readFileSync(
  'src/core/localization/translationCatalog.ts',
  'utf8',
);

function countVoiceTranslationKey(key) {
  const pattern = new RegExp(
    `^\\s*${key}:\\s`,
    'gm',
  );

  return voiceTranslations.match(pattern)?.length ?? 0;
}

test(
  'voice screen delegates focused presentation responsibilities',
  () => {
    for (const component of [
      'VoiceScreenHeader',
      'VoiceRecorderStatus',
      'VoiceRecorderControls',
      'VoiceRecordingDraftCard',
      'InlineErrorBanner',
    ]) {
      assert.match(screen, new RegExp(component));
    }

    assert.doesNotMatch(screen, /\bPressable\b/);
    assert.doesNotMatch(screen, /function Control/);
    assert.doesNotMatch(screen, /function formatDuration/);
    assert.doesNotMatch(screen, /label="Record"/);
  },
);

test(
  'voice recorder controller exposes stable error codes instead of UI copy',
  () => {
    assert.match(controller, /VoiceRecorderErrorCode/);
    assert.match(controller, /microphone-permission-denied/);
    assert.match(controller, /recording-start-failed/);
    assert.match(controller, /recording-stop-failed/);
    assert.match(controller, /recording-uri-unavailable/);

    assert.doesNotMatch(controller, /Microphone permission denied\./);
    assert.doesNotMatch(controller, /Unable to start recording\./);
    assert.doesNotMatch(controller, /Unable to stop recording\./);
  },
);

test(
  'voice controls and player meet accessible target and localization contracts',
  () => {
    assert.match(controls, /minHeight:\s*48/);
    assert.match(controls, /accessibilityLabel=\{label\}/);
    assert.match(player, /width:\s*48/);
    assert.match(player, /height:\s*48/);
    assert.match(player, /useLocale/);
    assert.match(player, /formatVoiceDurationSeconds/);
  },
);

test(
  'voice duration formatting is isolated and defensive',
  () => {
    assert.match(formatter, /formatVoiceDurationMs/);
    assert.match(formatter, /formatVoiceDurationSeconds/);
    assert.match(formatter, /Number\.isFinite/);
    assert.match(formatter, /padStart\(2, '0'\)/);
  },
);

test(
  'voice translations are feature scoped and merged into the app catalog',
  () => {
    assert.match(catalog, /voiceTranslations/);
    assert.match(catalog, /\.\.\.voiceTranslations\.ar/);
    assert.match(catalog, /\.\.\.voiceTranslations\.de/);
    assert.match(catalog, /\.\.\.voiceTranslations\.en/);

    for (const key of [
      'voiceConversation',
      'voiceRecorderTitle',
      'voiceDuration',
      'voicePhaseIdle',
      'voicePhasePreparing',
      'voicePhaseRecording',
      'voicePhasePaused',
      'voicePhaseStopped',
      'voicePhaseError',
      'voiceRecord',
      'voicePreparing',
      'voicePause',
      'voiceResume',
      'voiceStop',
      'voiceRecordingReady',
      'voiceDiscard',
      'voiceDiscardRecording',
      'voiceRecording',
      'voicePlayRecording',
      'voicePauseRecording',
      'voiceMicrophonePermissionDenied',
      'voiceRecordingStartFailed',
      'voiceRecordingStopFailed',
      'voiceRecordingUnavailable',
    ]) {
      assert.equal(
        countVoiceTranslationKey(key),
        3,
        `${key} must exist in ar, de and en`,
      );
    }
  },
);
