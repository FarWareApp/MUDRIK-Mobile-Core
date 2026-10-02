import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { useLocale } from '../../core/localization/LocaleProvider';
import { FlagshipSafeAreaScreen } from '../../design-system/components/FlagshipSafeAreaScreen';
import { spacing } from '../../design-system/tokens/spacing';
import { InlineErrorBanner } from '../../shared/components/InlineErrorBanner';

import { VoiceRecorderControls } from './components/VoiceRecorderControls';
import { VoiceRecorderStatus } from './components/VoiceRecorderStatus';
import { VoiceRecordingDraftCard } from './components/VoiceRecordingDraftCard';
import { VoiceScreenHeader } from './components/VoiceScreenHeader';
import { VoiceSessionOverview } from './components/VoiceSessionOverview';
import { useVoiceRecorderController } from './hooks/useVoiceRecorderController';

export function VoiceScreen() {
  const { t } = useLocale();
  const recorder = useVoiceRecorderController();

  const errorMessage =
    recorder.errorCode === 'microphone-permission-denied'
      ? t('voiceMicrophonePermissionDenied')
      : recorder.errorCode === 'recording-start-failed'
        ? t('voiceRecordingStartFailed')
        : recorder.errorCode === 'recording-stop-failed'
          ? t('voiceRecordingStopFailed')
          : recorder.errorCode === 'recording-uri-unavailable'
            ? t('voiceRecordingUnavailable')
            : recorder.errorCode === 'recording-delete-failed'
              ? t('voiceRecordingDeleteFailed')
              : null;

  return (
    <FlagshipSafeAreaScreen
      style={styles.safeArea}
    >
      <VoiceScreenHeader />

      {errorMessage ? (
        <InlineErrorBanner
          message={errorMessage}
          onDismiss={recorder.dismissError}
        />
      ) : null}

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <VoiceRecorderStatus
          phase={recorder.phase}
          durationMs={recorder.durationMs}
        />

        <View style={styles.controls}>
          <VoiceRecorderControls
            phase={recorder.phase}
            onStart={() => {
              void recorder.start();
            }}
            onPause={recorder.pause}
            onResume={recorder.resume}
            onStop={() => {
              void recorder.stop();
            }}
          />
        </View>

        {recorder.draft ? (
          <VoiceRecordingDraftCard
            draft={recorder.draft}
            onDiscard={recorder.discard}
          />
        ) : null}

        <VoiceSessionOverview
          permission={recorder.permission}
          hasDraft={recorder.draft !== null}
        />
      </ScrollView>
    </FlagshipSafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.huge,
  },
  controls: {
    width: '100%',
    maxWidth: 460,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
});
