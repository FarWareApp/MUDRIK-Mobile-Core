import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typography } from '../../../design-system/tokens/typography';

type Props = {
  label: string;
  value: number;
  minimum: number;
  maximum: number;
  step: number;
  displayValue: string;
  onChange: (value: number) => void;
};

export function CompanionNumericStepper({
  label,
  value,
  minimum,
  maximum,
  step,
  displayValue,
  onChange,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  const decreaseDisabled = value <= minimum;
  const increaseDisabled = value >= maximum;
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
          },
        ]}
      >
        <Text
          importantForAccessibility="no"
          style={[
            styles.glyph,
            { color: colors.textPrimary },
          ]}
        >
          −
        </Text>
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
          },
        ]}
      >
        <Text
          importantForAccessibility="no"
          style={[
            styles.glyph,
            { color: colors.textPrimary },
          ]}
        >
          +
        </Text>
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
    flex: 1,
    fontSize: typography.secondary,
    fontWeight: '600',
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 20,
    fontWeight: '600',
  },
  value: {
    minWidth: 58,
    paddingHorizontal: spacing.sm,
    fontSize: typography.secondary,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
});
