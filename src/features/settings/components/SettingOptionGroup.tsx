import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typography } from '../../../design-system/tokens/typography';

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

      <View style={styles.options}>
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
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
                },
              ]}
            >
              <Text
                style={{
                  color: selected
                    ? colors.accentText
                    : colors.textPrimary,
                  fontWeight: selected ? '700' : '500',
                }}
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
    fontSize: typography.secondary,
    fontWeight: '600',
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
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
});
