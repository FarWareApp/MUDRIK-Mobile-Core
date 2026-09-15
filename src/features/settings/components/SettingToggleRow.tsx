import React from 'react';
import {
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';

type Props = {
  label: string;
  description?: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
};

export function SettingToggleRow({
  label,
  description,
  value,
  disabled = false,
  onChange,
}: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: colors.border,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <View style={styles.text}>
        <Text
          style={[
            styles.label,
            { color: colors.textPrimary },
          ]}
        >
          {label}
        </Text>

        {description ? (
          <Text
            style={[
              styles.description,
              { color: colors.textSecondary },
            ]}
          >
            {description}
          </Text>
        ) : null}
      </View>

      <Switch
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        value={value}
        onValueChange={onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  text: {
    flex: 1,
    paddingEnd: spacing.lg,
  },
  label: {
    ...typeScale.secondary,
    fontWeight: '600',
    writingDirection: 'auto',
  },
  description: {
    ...typeScale.caption,
    marginTop: spacing.xs,
    writingDirection: 'auto',
  },
});
