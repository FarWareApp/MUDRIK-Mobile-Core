import React from 'react';
import {
  StyleSheet,
  Text,
} from 'react-native';

import type {
  CompanionInteractionStyle,
  CompanionPresenceLevel,
  CompanionVoicePreference,
} from '../../../contracts/Companion';
import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { spacing } from '../../../design-system/tokens/spacing';
import { typography } from '../../../design-system/tokens/typography';

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

  return (
    <Text
      style={[
        styles.text,
        { color: colors.textSecondary },
      ]}
    >
      {interactionLabels[interactionStyle]}
      {' · '}
      {presenceLabels[presenceLevel]}
      {' · '}
      {voiceLabels[voicePreference]}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    marginTop: spacing.lg,
    fontSize: typography.caption,
    textAlign: 'center',
  },
});
