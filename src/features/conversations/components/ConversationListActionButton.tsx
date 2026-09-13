import React, {
  PropsWithChildren,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';

type ActionTone =
  | 'default'
  | 'accent'
  | 'danger';

type Props = PropsWithChildren<{
  accessibilityLabel: string;
  disabled?: boolean;
  selected?: boolean;
  tone?: ActionTone;
  onPress: () => void;
}>;

export function ConversationListActionButton({
  accessibilityLabel,
  children,
  disabled = false,
  selected = false,
  tone = 'default',
  onPress,
}: Props) {
  const { colors } = useTheme();

  const textColor =
    tone === 'danger'
      ? colors.error
      : selected || tone === 'accent'
        ? colors.accent
        : colors.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{
        disabled,
        selected,
      }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: selected
            ? colors.accentSoft
            : pressed
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
          { color: textColor },
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
