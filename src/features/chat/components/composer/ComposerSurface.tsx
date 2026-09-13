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
          {
            backgroundColor: colors.surface,
            borderColor: focused
              ? colors.accent
              : colors.border,
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
    paddingBottom: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  surface: {
    minHeight: 58,
    maxHeight: 154,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.xl,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
});
