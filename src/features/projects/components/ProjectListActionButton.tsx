import React, { PropsWithChildren } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';

type ActionTone = 'default' | 'danger';

type Props = PropsWithChildren<{
  accessibilityLabel: string;
  disabled?: boolean;
  tone?: ActionTone;
  onPress: () => void;
}>;

export function ProjectListActionButton({
  accessibilityLabel,
  children,
  disabled = false,
  tone = 'default',
  onPress,
}: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: pressed
            ? colors.surfacePressed
            : 'transparent',
          opacity: disabled
            ? 0.44
            : pressed
              ? 0.82
              : 1,
        },
      ]}
    >
      <Text
        importantForAccessibility="no"
        style={[
          styles.glyph,
          {
            color:
              tone === 'danger'
                ? colors.error
                : colors.textSecondary,
          },
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
  },
});
