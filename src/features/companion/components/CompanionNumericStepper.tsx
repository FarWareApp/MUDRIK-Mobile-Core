import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAccessibility } from '../../../core/accessibility/AccessibilityProvider';
import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { motion } from '../../../design-system/tokens/motion';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';
import { CompanionStepperIcon } from './CompanionStepperIcon';

type Props = {
  label: string;
  value: number;
  minimum: number;
  maximum: number;
  step: number;
  displayValue: string;
  disabled?: boolean;
  onChange: (value: number) => void;
};

export function CompanionNumericStepper({
  label,
  value,
  minimum,
  maximum,
  step,
  displayValue,
  disabled = false,
  onChange,
}: Props) {
  const { colors } = useTheme();
  const { reducedMotion } = useAccessibility();
  const { t } = useLocale();

  const decreaseDisabled =
    disabled || value <= minimum;
  const increaseDisabled =
    disabled || value >= maximum;
  const decrease = Math.max(minimum, value - step);
  const increase = Math.min(maximum, value + step);

  return (
    <View
      style={[
        styles.container,
        { borderBottomColor: colors.border },
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: colors.textPrimary },
        ]}
      >
        {label}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('decrease')}: ${label}`}
        accessibilityState={{ disabled: decreaseDisabled }}
        disabled={decreaseDisabled}
        onPress={() => onChange(decrease)}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: pressed
              ? colors.surfacePressed
              : colors.surfaceElevated,
            opacity: decreaseDisabled ? 0.4 : 1,
            transform: [
              {
                scale:
                  pressed
                  && !decreaseDisabled
                  && !reducedMotion
                    ? motion.press.subtleScale
                    : 1,
              },
            ],
          },
        ]}
      >
        <CompanionStepperIcon
          kind="decrease"
          color={colors.textPrimary}
        />
      </Pressable>

      <Text
        accessibilityLabel={`${label}: ${displayValue}`}
        style={[
          styles.value,
          { color: colors.textSecondary },
        ]}
      >
        {displayValue}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('increase')}: ${label}`}
        accessibilityState={{ disabled: increaseDisabled }}
        disabled={increaseDisabled}
        onPress={() => onChange(increase)}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: pressed
              ? colors.surfacePressed
              : colors.surfaceElevated,
            opacity: increaseDisabled ? 0.4 : 1,
            transform: [
              {
                scale:
                  pressed
                  && !increaseDisabled
                  && !reducedMotion
                    ? motion.press.subtleScale
                    : 1,
              },
            ],
          },
        ]}
      >
        <CompanionStepperIcon
          kind="increase"
          color={colors.textPrimary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    ...typeScale.secondary,
    flex: 1,
    fontWeight: '600',
    writingDirection: 'auto',
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    ...typeScale.secondary,
    minWidth: 58,
    paddingHorizontal: spacing.sm,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
});
