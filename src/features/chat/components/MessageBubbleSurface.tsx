import React, {
  PropsWithChildren,
} from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';

type Props = PropsWithChildren<{
  isUser: boolean;
}>;

export function MessageBubbleSurface({
  children,
  isUser,
}: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.bubble,
        isUser
          ? styles.userShape
          : styles.assistantShape,
        {
          alignSelf: isUser
            ? 'flex-end'
            : 'flex-start',
          backgroundColor: isUser
            ? colors.accent
            : colors.surfaceElevated,
          borderColor: isUser
            ? 'transparent'
            : colors.border,
          borderWidth: isUser
            ? 0
            : StyleSheet.hairlineWidth,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '86%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    marginVertical: spacing.xs,
  },
  userShape: {
    borderBottomRightRadius: radius.sm,
  },
  assistantShape: {
    borderBottomLeftRadius: radius.sm,
  },
});
