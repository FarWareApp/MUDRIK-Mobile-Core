import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { VoiceRecorderPhase } from '../types';
import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typography } from '../../../design-system/tokens/typography';
import { formatVoiceDurationMs } from '../formatters/formatVoiceDuration';
import { VoiceRecorderIndicator } from './VoiceRecorderIndicator';

type Props = {
  phase: VoiceRecorderPhase;
  durationMs: number;
};

export function VoiceRecorderStatus({
  phase,
  durationMs,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  const phaseLabels: Record<VoiceRecorderPhase, string> = {
    idle: t('voicePhaseIdle'),
    preparing: t('voicePhasePreparing'),
    recording: t('voicePhaseRecording'),
    paused: t('voicePhasePaused'),
    stopped: t('voicePhaseStopped'),
    error: t('voicePhaseError'),
  };

  const active = phase === 'recording';

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.title,
          { color: colors.textPrimary },
        ]}
      >
        {t('voiceRecorderTitle')}
      </Text>

      <Text
        accessibilityLabel={`${t('voiceDuration')}: ${formatVoiceDurationMs(durationMs)}`}
        style={[
          styles.duration,
          { color: colors.textPrimary },
        ]}
      >
        {formatVoiceDurationMs(durationMs)}
      </Text>

      <View
        accessibilityLabel={phaseLabels[phase]}
        style={[
          styles.mic,
          {
            backgroundColor: active
              ? colors.error
              : colors.accent,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <VoiceRecorderIndicator
          color={colors.accentText}
        />
      </View>

      <Text
        style={[
          styles.phase,
          { color: colors.textSecondary },
        ]}
      >
        {phaseLabels[phase]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  title: {
    fontSize: typography.heading,
    fontWeight: '700',
  },
  duration: {
    marginTop: spacing.md,
    fontSize: 30,
    fontVariant: ['tabular-nums'],
  },
  mic: {
    width: 116,
    height: 116,
    marginTop: spacing.xxl,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 7,
    },
  },
  phase: {
    marginTop: spacing.md,
    fontSize: typography.secondary,
  },
});
