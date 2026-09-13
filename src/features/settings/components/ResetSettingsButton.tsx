import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';

export function ResetSettingsButton({
  onPress,
}: {
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useLocale();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('resetSettings')}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          borderColor: colors.border,
          backgroundColor: pressed
            ? colors.surfacePressed
            : 'transparent',
        },
      ]}
    >
      <Text
        style={{
          color: colors.textPrimary,
          fontWeight: '600',
        }}
      >
        {t('resetSettings')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'center',
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xxl,
    marginBottom: spacing.huge,
  },
});
