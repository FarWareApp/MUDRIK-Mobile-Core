import React from 'react';
import {
  ActivityIndicator,
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
  disabled?: boolean;
  busy?: boolean;
  onPress: () => void;
};

export function ResetSettingsButton({
  disabled = false,
  busy = false,
  onPress,
}: Props) {
  const { colors } = useTheme();
  const { reducedMotion } = useAccessibility();
  const { t } = useLocale();
  const blocked = disabled || busy;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('resetSettings')}
      accessibilityState={{
        disabled: blocked,
        busy,
      }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          borderColor: colors.border,
          backgroundColor: pressed
            ? colors.surfacePressed
            : 'transparent',
          opacity: blocked ? 0.5 : 1,
          transform: [
            {
              scale:
                pressed && !blocked && !reducedMotion
                  ? motion.press.subtleScale
                  : 1,
            },
          ],
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator
          color={colors.textPrimary}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.label,
            { color: colors.textPrimary },
          ]}
        >
          {t('resetSettings')}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'center',
    minWidth: 132,
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xxl,
    marginBottom: spacing.huge,
  },
  label: {
    ...typeScale.secondary,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'auto',
  },
});
