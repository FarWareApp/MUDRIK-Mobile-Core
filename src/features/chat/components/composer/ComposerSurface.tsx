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
          borderTopColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.surface,
          focused && styles.focusedSurface,
          {
            backgroundColor: focused
              ? colors.surface
              : colors.surfaceInput,
            borderColor: focused
              ? colors.accent
              : colors.border,
            shadowColor: colors.shadow,
            shadowOpacity: focused
              ? 0.18
              : 0.1,
            shadowRadius: focused
              ? 14
              : 8,
            shadowOffset: {
              width: 0,
              height: focused ? 5 : 3,
            },
            elevation: focused ? 5 : 2,
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
    borderTopWidth:
      StyleSheet.hairlineWidth,
  },
  surface: {
    minHeight: 60,
    maxHeight: 160,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    padding: spacing.sm,
  },
  focusedSurface: {
    borderWidth: 1,
  },
});
