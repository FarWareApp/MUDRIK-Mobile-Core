import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useLocale,
} from '../../../core/localization/LocaleProvider';
import {
  PremiumHeroSurface,
} from '../../../design-system/components/PremiumHeroSurface';
import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';
import {
  radius,
} from '../../../design-system/tokens/radius';
import {
  spacing,
} from '../../../design-system/tokens/spacing';
import {
  typography,
} from '../../../design-system/tokens/typography';
import {
  formatVoiceDurationMs,
} from '../formatters/formatVoiceDuration';
import type {
  VoiceRecorderPhase,
} from '../types';
import {
  VoiceSignalStage,
} from './VoiceSignalStage';

type Props = {
  phase: VoiceRecorderPhase;
  durationMs: number;
};

export function VoiceRecorderStatus({
  phase,
  durationMs,
}: Props) {
  const { colors } = useTheme();
  const { t, isRTL } = useLocale();

  const phaseLabels:
    Record<VoiceRecorderPhase, string> = {
      idle: t('voicePhaseIdle'),
      preparing:
        t('voicePhasePreparing'),
      recording:
        t('voicePhaseRecording'),
      paused:
        t('voicePhasePaused'),
      stopped:
        t('voicePhaseStopped'),
      error:
        t('voicePhaseError'),
    };

  const active =
    phase === 'recording';

  return (
    <PremiumHeroSurface
      strong
      active={active}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text
            style={[
              styles.eyebrow,
              {
                color: colors.accent,
                textAlign: isRTL
                  ? 'right'
                  : 'left',
              },
            ]}
          >
            {t('voiceStudioEyebrow')}
          </Text>

          <Text
            style={[
              styles.title,
              {
                color:
                  colors.textPrimary,
              },
            ]}
          >
            {t('voiceRecorderTitle')}
          </Text>
        </View>

        <View
          style={[
            styles.liveBadge,
            {
              backgroundColor: active
                ? colors.error
                : colors.accentSoft,
            },
          ]}
        >
          <View
            style={[
              styles.liveDot,
              {
                backgroundColor: active
                  ? colors.accentText
                  : colors.accent,
              },
            ]}
          />
          <Text
            style={[
              styles.liveText,
              {
                color: active
                  ? colors.accentText
                  : colors.accent,
              },
            ]}
          >
            {phaseLabels[phase]}
          </Text>
        </View>
      </View>

      <Text
        accessibilityLabel={`${t('voiceDuration')}: ${formatVoiceDurationMs(durationMs)}`}
        style={[
          styles.duration,
          {
            color: colors.textPrimary,
          },
        ]}
      >
        {formatVoiceDurationMs(durationMs)}
      </Text>

      <VoiceSignalStage
        phase={phase}
      />

      <View style={styles.qualityRow}>
        <View
          style={[
            styles.qualityPill,
            {
              backgroundColor:
                colors.surfaceInput,
              borderColor:
                colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.qualityText,
              {
                color:
                  colors.textSecondary,
              },
            ]}
          >
            48 kHz · AAC · 192 kbps
          </Text>
        </View>

        <View
          style={[
            styles.qualityPill,
            {
              backgroundColor:
                colors.accentSoft,
              borderColor:
                colors.accentSoft,
            },
          ]}
        >
          <Text
            style={[
              styles.qualityText,
              {
                color: colors.accent,
              },
            ]}
          >
            {t('voicePrivateCapture')}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.caption,
          {
            color:
              colors.textSecondary,
          },
        ]}
      >
        {t('voiceStudioCaption')}
      </Text>
    </PremiumHeroSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 460,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent:
      'space-between',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: typography.micro,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: 0.7,
    writingDirection: 'ltr',
  },
  title: {
    marginTop: spacing.xs,
    fontSize: typography.title,
    lineHeight: 29,
    fontWeight: '800',
    writingDirection: 'auto',
  },
  liveBadge: {
    maxWidth: 150,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
  },
  liveText: {
    flexShrink: 1,
    fontSize: typography.caption,
    lineHeight: 16,
    fontWeight: '700',
    writingDirection: 'auto',
  },
  duration: {
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
    fontSize: 44,
    lineHeight: 52,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  qualityRow: {
    width: '100%',
    marginTop: spacing.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  qualityPill: {
    minHeight: 34,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  qualityText: {
    fontSize: typography.caption,
    lineHeight: 16,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'auto',
  },
  caption: {
    marginTop: spacing.lg,
    maxWidth: 330,
    fontSize: typography.secondary,
    lineHeight: 21,
    textAlign: 'center',
    writingDirection: 'auto',
  },
});
