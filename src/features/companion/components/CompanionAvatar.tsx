import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {
  CompanionPresentation,
  CompanionSessionPhase,
} from '../../../contracts/Companion';
import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';
import { getCompanionPhaseTranslationKey } from '../getCompanionPhaseTranslationKey';
import { CompanionAvatarMark } from './CompanionAvatarMark';

type Props = {
  presentation: CompanionPresentation;
  phase: CompanionSessionPhase;
  name: string;
};

export function CompanionAvatar({
  presentation,
  phase,
  name,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const phaseLabel =
    t(getCompanionPhaseTranslationKey(phase));
  const speaking = phase === 'speaking';
  const active =
    phase === 'listening'
    || phase === 'processing'
    || speaking;
  const foreground = speaking
    ? colors.accentText
    : colors.textPrimary;
  const markAccent = speaking
    ? colors.accentText
    : colors.accent;

  return (
    <View
      accessible
      accessibilityLabel={`${name}. ${phaseLabel}`}
      accessibilityLiveRegion="polite"
      style={styles.wrapper}
    >
      <View
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.avatar,
          {
            backgroundColor: speaking
              ? colors.accent
              : colors.surfaceElevated,
            borderColor: active
              ? colors.accent
              : colors.border,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <CompanionAvatarMark
          presentation={presentation}
          color={foreground}
          accentColor={markAccent}
          active={active}
        />
      </View>

      <Text
        importantForAccessibility="no"
        style={[
          styles.name,
          { color: colors.textPrimary },
        ]}
      >
        {name}
      </Text>

      <Text
        importantForAccessibility="no"
        style={[
          styles.phase,
          { color: colors.textSecondary },
        ]}
      >
        {phaseLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  avatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },
  },
  name: {
    ...typeScale.title,
    maxWidth: 320,
    marginTop: spacing.xl,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'auto',
  },
  phase: {
    ...typeScale.caption,
    marginTop: spacing.xs,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'auto',
  },
});
