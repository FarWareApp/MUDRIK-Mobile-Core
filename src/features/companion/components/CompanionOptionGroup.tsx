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

type Props<T extends string> = {
  title: string;
  value: T;
  options: readonly (readonly [T, string])[];
  disabled?: boolean;
  onChange: (value: T) => void;
};

export function CompanionOptionGroup<T extends string>({
  title,
  value,
  options,
  disabled = false,
  onChange,
}: Props<T>) {
  const { colors } = useTheme();
  const { reducedMotion } = useAccessibility();

  return (
    <View style={styles.group}>
      <Text
        style={[
          styles.groupTitle,
          { color: colors.textSecondary },
        ]}
      >
        {title}
      </Text>

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={title}
        style={styles.options}
      >
        {options.map(([key, label]) => {
          const selected = value === key;

          return (
            <Pressable
              key={key}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityState={{
                disabled,
                selected,
              }}
              disabled={disabled}
              onPress={() => onChange(key)}
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
                  opacity: disabled ? 0.52 : 1,
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
                  styles.optionText,
                  {
                    color: selected
                      ? colors.accentText
                      : colors.textPrimary,
                    fontWeight: selected
                      ? '700'
                      : '500',
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginTop: spacing.xl,
  },
  groupTitle: {
    ...typeScale.caption,
    marginBottom: spacing.sm,
    fontWeight: '700',
    writingDirection: 'auto',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  optionText: {
    ...typeScale.secondary,
    textAlign: 'center',
    writingDirection: 'auto',
  },
});
