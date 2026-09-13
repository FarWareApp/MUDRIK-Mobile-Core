import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLocale } from '../../core/localization/LocaleProvider';
import { useTheme } from '../../design-system/theme/ThemeProvider';
import { spacing } from '../../design-system/tokens/spacing';
import { InlineErrorBanner } from '../../shared/components/InlineErrorBanner';

import { VoiceRecorderControls } from './components/VoiceRecorderControls';
import { VoiceRecorderStatus } from './components/VoiceRecorderStatus';
import { VoiceRecordingDraftCard } from './components/VoiceRecordingDraftCard';
import { VoiceScreenHeader } from './components/VoiceScreenHeader';
import { useVoiceRecorderController } from './hooks/useVoiceRecorderController';

export function VoiceScreen() {
  const { colors } = useTheme();
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
            : null;

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colors.background },
      ]}
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.huge,
  },
  controls: {
    marginTop: spacing.xxl,
  },
});
