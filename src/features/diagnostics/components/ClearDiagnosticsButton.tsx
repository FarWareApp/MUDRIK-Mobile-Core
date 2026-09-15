import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

import { useAccessibility } from '../../../core/accessibility/AccessibilityProvider';
import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { motion } from '../../../design-system/tokens/motion';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';

type Props = {
  disabled: boolean;
  onPress: () => void;
};

export function ClearDiagnosticsButton({
  disabled,
  onPress,
}: Props) {
  const { colors } = useTheme();
  const { reducedMotion } = useAccessibility();
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
          borderColor: colors.error,
          backgroundColor: pressed
            ? colors.surfacePressed
            : 'transparent',
          opacity: disabled ? 0.44 : 1,
          transform: [
            {
              scale:
                pressed
                && !disabled
                && !reducedMotion
                  ? motion.press.subtleScale
                  : 1,
            },
          ],
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: colors.error },
        ]}
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
  label: {
    ...typeScale.secondary,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'auto',
  },
});
