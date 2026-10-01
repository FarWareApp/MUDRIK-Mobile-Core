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
          borderColor: pressed
            ? colors.error
            : colors.border,
          backgroundColor: pressed
            ? colors.surfacePressed
            : colors.surface,
          opacity: blocked ? 0.5 : 1,
          shadowColor: colors.shadow,
          shadowOpacity: blocked ? 0 : 0.06,
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
          color={colors.error}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.label,
            { color: colors.error },
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
    minWidth: 148,
    minHeight: 46,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xxxl,
    marginBottom: spacing.huge,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },
  label: {
    ...typeScale.secondary,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'auto',
  },
});
