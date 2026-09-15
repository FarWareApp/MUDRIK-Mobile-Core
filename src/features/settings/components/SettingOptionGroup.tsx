import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAccessibility } from '../../../core/accessibility/AccessibilityProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { motion } from '../../../design-system/tokens/motion';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';

type Option<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  label: string;
  value: T;
  options: readonly Option<T>[];
  disabled?: boolean;
  onChange: (value: T) => void;
};

export function SettingOptionGroup<T extends string>({
  label,
  value,
  options,
  disabled = false,
  onChange,
}: Props<T>) {
  const { colors } = useTheme();
  const { reducedMotion } = useAccessibility();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
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

      <View style={styles.options}>
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: selected
                    ? colors.accent
                    : pressed
                      ? colors.surfacePressed
                      : colors.surfaceElevated,
                  borderColor: selected
                    ? colors.accent
                    : colors.border,
                  opacity: disabled ? 0.5 : 1,
                  transform: [
                    {
                      scale:
                        pressed && !disabled && !reducedMotion
                          ? motion.press.subtleScale
                          : 1,
                    },
                  ],
                },
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  {
                    color: selected
                      ? colors.accentText
                      : colors.textPrimary,
                    fontWeight: selected ? '700' : '600',
                  },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    ...typeScale.secondary,
    fontWeight: '600',
    writingDirection: 'auto',
  },
  options: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  optionText: {
    ...typeScale.secondary,
    textAlign: 'center',
    writingDirection: 'auto',
  },
});
