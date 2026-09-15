import React from 'react';
import {
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';

type Props = {
  title: string;
  description: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
};

export function CompanionToggleRow({
  title,
  description,
  value,
  disabled = false,
  onChange,
}: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <View style={styles.copy}>
        <Text
          style={[
            styles.title,
            { color: colors.textPrimary },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.description,
            { color: colors.textSecondary },
          ]}
        >
          {description}
        </Text>
      </View>

      <Switch
        accessibilityLabel={title}
        accessibilityState={{
          disabled,
          checked: value,
        }}
        disabled={disabled}
        value={value}
        onValueChange={onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  copy: {
    flex: 1,
    paddingEnd: spacing.md,
  },
  title: {
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
