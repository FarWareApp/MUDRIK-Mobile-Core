import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';

type Props = {
  enabled: boolean;
};

export function CompanionCaptionCard({
  enabled,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
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
        {enabled
          ? t('companionSessionReady')
          : t('companionDisabledCaption')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 420,
    marginTop: spacing.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  text: {
    ...typeScale.secondary,
    textAlign: 'center',
    writingDirection: 'auto',
  },
});
