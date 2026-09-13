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

type Props = {
  disabled: boolean;
  onPress: () => void;
};

export function ClearDiagnosticsButton({
  disabled,
  onPress,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('clearLocalDiagnostics')}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          borderColor: colors.border,
          backgroundColor: pressed
            ? colors.surfacePressed
            : 'transparent',
          opacity: disabled ? 0.44 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: colors.textPrimary,
          fontWeight: '700',
        }}
      >
        {t('clearDiagnostics')}
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
    marginTop: spacing.lg,
  },
});
