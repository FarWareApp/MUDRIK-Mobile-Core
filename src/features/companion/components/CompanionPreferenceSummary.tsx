import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {
  CompanionInteractionStyle,
  CompanionPresenceLevel,
  CompanionVoicePreference,
} from '../../../contracts/Companion';
import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';

type Props = {
  interactionStyle: CompanionInteractionStyle;
  presenceLevel: CompanionPresenceLevel;
  voicePreference: CompanionVoicePreference;
};

export function CompanionPreferenceSummary({
  interactionStyle,
  presenceLevel,
  voicePreference,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  const interactionLabels = {
    balanced: t('companionStyleBalanced'),
    warm: t('companionStyleWarm'),
    calm: t('companionStyleCalm'),
    direct: t('companionStyleDirect'),
  } satisfies Record<CompanionInteractionStyle, string>;

  const presenceLabels = {
    silent: t('companionPresenceSilent'),
    normal: t('companionPresenceNormal'),
    helpful: t('companionPresenceHelpful'),
    active: t('companionPresenceActive'),
  } satisfies Record<CompanionPresenceLevel, string>;

  const voiceLabels = {
    auto: t('companionVoiceAuto'),
    male: t('companionVoiceMale'),
    female: t('companionVoiceFemale'),
  } satisfies Record<CompanionVoicePreference, string>;

  const labels = [
    interactionLabels[interactionStyle],
    presenceLabels[presenceLevel],
    voiceLabels[voicePreference],
  ];

  return (
    <View style={styles.container}>
      {labels.map((label, index) => (
        <View
          key={`${index}:${label}`}
          style={[
            styles.chip,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.text,
              { color: colors.textSecondary },
            ]}
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  chip: {
    minHeight: 32,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  text: {
    ...typeScale.caption,
    textAlign: 'center',
    writingDirection: 'auto',
  },
});
