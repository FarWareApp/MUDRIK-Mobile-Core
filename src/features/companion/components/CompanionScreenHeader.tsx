import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { useAccessibility } from '../../../core/accessibility/AccessibilityProvider';
import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { motion } from '../../../design-system/tokens/motion';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';
import { CompanionBackIcon } from './CompanionBackIcon';
import { CompanionEditIcon } from './CompanionEditIcon';

type Props = {
  disabled?: boolean;
  onEdit: () => void;
};

export function CompanionScreenHeader({
  disabled = false,
  onEdit,
}: Props) {
  const { colors } = useTheme();
  const { reducedMotion } = useAccessibility();
  const { isRTL, t } = useLocale();

  return (
    <View
      style={[
        styles.container,
        { borderBottomColor: colors.border },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('back')}
        onPress={() => router.back()}
        style={({ pressed }) => [
          styles.circleButton,
          {
            backgroundColor: pressed
              ? colors.surfacePressed
              : colors.surfaceElevated,
            borderColor: colors.border,
            transform: [
              {
                scale:
                  pressed && !reducedMotion
                    ? motion.press.subtleScale
                    : 1,
              },
            ],
          },
        ]}
      >
        <CompanionBackIcon
          color={colors.textPrimary}
          isRTL={isRTL}
        />
      </Pressable>

      <Text
        accessibilityRole="header"
        style={[
          styles.title,
          { color: colors.textPrimary },
        ]}
      >
        {t('companion')}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('editCompanion')}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onEdit}
        style={({ pressed }) => [
          styles.circleButton,
          {
            backgroundColor: pressed
              ? colors.surfacePressed
              : colors.surfaceElevated,
            borderColor: colors.border,
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
        <CompanionEditIcon
          color={colors.textPrimary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typeScale.heading,
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
  },
});
