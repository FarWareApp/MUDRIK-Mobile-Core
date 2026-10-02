import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  LinearGradient,
} from 'expo-linear-gradient';

import {
  SUPPORTED_LOCALES,
} from '../../../core/localization/AppLocale';
import {
  useLocale,
} from '../../../core/localization/LocaleProvider';
import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';
import {
  flagshipPalette,
} from '../../../design-system/tokens/flagship';
import {
  radius,
} from '../../../design-system/tokens/radius';
import {
  spacing,
} from '../../../design-system/tokens/spacing';
import {
  typeScale,
} from '../../../design-system/tokens/typography';
import {
  MUDRIK_VOICE_SAMPLE_RATE,
} from '../../voice/VoiceRecordingProfile';

type ItemProps = {
  eyebrow: string;
  value: string;
  accent?: boolean;
};

function PresenceItem({
  eyebrow,
  value,
  accent = false,
}: ItemProps) {
  const {
    colors,
    mode,
  } = useTheme();
  const palette =
    flagshipPalette[mode];

  return (
    <View style={styles.item}>
      <View
        importantForAccessibility="no"
        style={[
          styles.signal,
          {
            backgroundColor:
              accent
                ? colors.accent
                : palette.metal,
          },
        ]}
      />

      <Text
        numberOfLines={1}
        style={[
          styles.eyebrow,
          {
            color:
              colors.textSecondary,
          },
        ]}
      >
        {eyebrow}
      </Text>

      <Text
        numberOfLines={1}
        style={[
          styles.value,
          {
            color: accent
              ? colors.accent
              : colors.textPrimary,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export function HomePresenceDeck() {
  const {
    mode,
  } = useTheme();
  const { t } = useLocale();
  const palette =
    flagshipPalette[mode];
  const voiceKhz =
    MUDRIK_VOICE_SAMPLE_RATE
    / 1000;

  return (
    <LinearGradient
      colors={palette.card}
      start={{
        x: 0.04,
        y: 0,
      }}
      end={{
        x: 0.96,
        y: 1,
      }}
      style={[
        styles.deck,
        {
          borderColor:
            palette.hairline,
        },
      ]}
    >
      <View
        importantForAccessibility="no"
        pointerEvents="none"
        style={[
          styles.topRail,
          {
            backgroundColor:
              palette.metal,
          },
        ]}
      />

      <PresenceItem
        eyebrow={
          t('homePresencePrivacy')
        }
        value={
          t('homePresenceLocal')
        }
        accent
      />

      <View
        importantForAccessibility="no"
        style={[
          styles.divider,
          {
            backgroundColor:
              palette.hairline,
          },
        ]}
      />

      <PresenceItem
        eyebrow={
          t('homePresenceVoice')
        }
        value={`${voiceKhz} kHz`}
      />

      <View
        importantForAccessibility="no"
        style={[
          styles.divider,
          {
            backgroundColor:
              palette.hairline,
          },
        ]}
      />

      <PresenceItem
        eyebrow={
          t('homePresenceLanguages')
        }
        value={String(
          SUPPORTED_LOCALES.length,
        )}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  deck: {
    minHeight: 92,
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
  },
  topRail: {
    position: 'absolute',
    top: 0,
    start: 24,
    width: 58,
    height: 1,
    opacity: 0.48,
  },
  item: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
  },
  signal: {
    width: 18,
    height: 3,
    borderRadius: radius.pill,
    opacity: 0.88,
  },
  eyebrow: {
    ...typeScale.micro,
    marginTop: spacing.sm,
    fontWeight: '700',
    writingDirection: 'auto',
  },
  value: {
    ...typeScale.secondary,
    marginTop: spacing.xxs,
    fontWeight: '900',
    writingDirection: 'auto',
  },
  divider: {
    width:
      StyleSheet.hairlineWidth,
    height: 48,
    opacity: 0.72,
  },
});
