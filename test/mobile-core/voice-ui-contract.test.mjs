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
const header = fs.readFileSync(
  'src/features/voice/components/VoiceScreenHeader.tsx',
  'utf8',
);
const backIcon = fs.readFileSync(
  'src/features/voice/components/VoiceBackIcon.tsx',
  'utf8',
);
const status = fs.readFileSync(
  'src/features/voice/components/VoiceRecorderStatus.tsx',
  'utf8',
);
const recorderIndicator = fs.readFileSync(
  'src/features/voice/components/VoiceRecorderIndicator.tsx',
  'utf8',
);
const controls = fs.readFileSync(
  'src/features/voice/components/VoiceRecorderControls.tsx',
  'utf8',
);
const controlButton = fs.readFileSync(
  'src/features/voice/components/VoiceControlButton.tsx',
  'utf8',
);
const player = fs.readFileSync(
  'src/features/voice/components/VoiceRecordingPlayer.tsx',
  'utf8',
);
const playbackIcon = fs.readFileSync(
  'src/features/voice/components/VoicePlaybackIcon.tsx',
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
  'voice controls delegate button presentation and keep accessible targets',
  () => {
    assert.match(controls, /VoiceControlButton/);
    assert.doesNotMatch(controls, /\bPressable\b/);
    assert.doesNotMatch(controls, /useTheme/);
    assert.match(controlButton, /minHeight:\s*48/);
    assert.match(controlButton, /accessibilityLabel=\{label\}/);
    assert.match(controlButton, /motion\.press\.subtleScale/);
    assert.doesNotMatch(controlButton, /\?\s*0\.98/);
  },
);

test(
  'voice navigation and recorder status use platform stable visual primitives',
  () => {
    assert.match(header, /VoiceBackIcon/);
    assert.match(header, /const \{ t, isRTL \} = useLocale\(\)/);
    assert.doesNotMatch(header, /‹/u);
    assert.match(backIcon, /isRTL/);
    assert.match(backIcon, /scaleX:\s*-1/);
    assert.match(
      backIcon,
      /importantForAccessibility="no-hide-descendants"/,
    );

    assert.match(status, /VoiceRecorderIndicator/);
    assert.doesNotMatch(status, /●/u);
    assert.doesNotMatch(status, /#FFFFFF/);
    assert.match(status, /colors\.accentText/);
    assert.match(
      recorderIndicator,
      /importantForAccessibility="no-hide-descendants"/,
    );
  },
);

test(
  'voice playback keeps accessible targets, semantic spacing and tokenized motion',
  () => {
    assert.match(player, /width:\s*48/);
    assert.match(player, /height:\s*48/);
    assert.match(player, /useLocale/);
    assert.match(player, /formatVoiceDurationSeconds/);
    assert.match(player, /VoicePlaybackIcon/);
    assert.match(player, /motion\.press\.scale/);
    assert.match(player, /marginStart:\s*spacing\.md/);
    assert.doesNotMatch(player, /marginLeft:/);
    assert.doesNotMatch(player, /[Ⅱ▶]/u);
    assert.match(
      playbackIcon,
      /importantForAccessibility="no-hide-descendants"/,
    );
    assert.match(playbackIcon, /borderLeftWidth:\s*10/);
    assert.match(playbackIcon, /styles\.pauseStart/);
    assert.match(playbackIcon, /styles\.pauseEnd/);
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
