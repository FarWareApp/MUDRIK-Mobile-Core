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

type Props<T extends string> = {
  title: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
};

export function CompanionOptionGroup<T extends string>({
  title,
  value,
  options,
  onChange,
}: Props<T>) {
  const { colors } = useTheme();

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

      <View style={styles.options}>
        {options.map(([key, label]) => {
          const selected = value === key;

          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
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
    marginBottom: spacing.sm,
    fontSize: typography.caption,
    fontWeight: '700',
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
  },
});
