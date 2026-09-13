import React, {
  PropsWithChildren,
} from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

import { useTheme } from '../../../../design-system/theme/ThemeProvider';
import { radius } from '../../../../design-system/tokens/radius';
import { spacing } from '../../../../design-system/tokens/spacing';

type Props = PropsWithChildren<{
  focused: boolean;
}>;

export function ComposerSurface({
  children,
  focused,
}: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.background,
          borderTopColor: focused
            ? colors.accentSoft
            : colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.surface,
          focused && styles.focusedSurface,
          {
            backgroundColor: colors.surfaceInput,
            borderColor: focused
              ? colors.accent
              : colors.border,
            shadowColor: colors.shadow,
            shadowOpacity: focused
              ? 0.32
              : 0.18,
            shadowRadius: focused
              ? 18
              : 10,
            shadowOffset: {
              width: 0,
              height: focused
                ? 8
                : 4,
            },
            elevation: focused
              ? 8
              : 3,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  surface: {
    minHeight: 64,
    maxHeight: 166,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  focusedSurface: {
    borderWidth: 1,
  },
});
