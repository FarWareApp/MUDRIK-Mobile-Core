import React, {
  PropsWithChildren,
} from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

import { useLocale } from '../../../core/localization/LocaleProvider';
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
  const { isRTL } = useLocale();
  const { colors } = useTheme();

  const shapeStyle = isUser
    ? isRTL
      ? styles.userShapeRTL
      : styles.userShapeLTR
    : isRTL
      ? styles.assistantShapeRTL
      : styles.assistantShapeLTR;

  return (
    <View
      style={[
        styles.bubble,
        shapeStyle,
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
  userShapeLTR: {
    borderBottomRightRadius: radius.sm,
  },
  userShapeRTL: {
    borderBottomLeftRadius: radius.sm,
  },
  assistantShapeLTR: {
    borderBottomLeftRadius: radius.sm,
  },
  assistantShapeRTL: {
    borderBottomRightRadius: radius.sm,
  },
});
