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
import type {
  MessageGroupPosition,
} from '../list/buildMessageListItems';

type Props = PropsWithChildren<{
  isUser: boolean;
  groupPosition: MessageGroupPosition;
}>;

function getGroupSpacingStyle(
  groupPosition: MessageGroupPosition,
) {
  switch (groupPosition) {
    case 'first':
      return styles.firstSpacing;
    case 'middle':
      return styles.middleSpacing;
    case 'last':
      return styles.lastSpacing;
    default:
      return styles.singleSpacing;
  }
}

export function MessageBubbleSurface({
  children,
  isUser,
  groupPosition,
}: Props) {
  const { isRTL } = useLocale();
  const { colors } = useTheme();

  const tailStyle = isUser
    ? isRTL
      ? styles.userTailRTL
      : styles.userTailLTR
    : isRTL
      ? styles.assistantTailRTL
      : styles.assistantTailLTR;

  const groupedWithPrevious =
    groupPosition === 'middle'
    || groupPosition === 'last';

  const connectionStyle = groupedWithPrevious
    ? isUser
      ? isRTL
        ? styles.userConnectionRTL
        : styles.userConnectionLTR
      : isRTL
        ? styles.assistantConnectionRTL
        : styles.assistantConnectionLTR
    : null;

  return (
    <View
      style={[
        styles.bubble,
        getGroupSpacingStyle(groupPosition),
        tailStyle,
        connectionStyle,
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
  },
  singleSpacing: {
    marginVertical: spacing.xs,
  },
  firstSpacing: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs / 2,
  },
  middleSpacing: {
    marginVertical: spacing.xs / 2,
  },
  lastSpacing: {
    marginTop: spacing.xs / 2,
    marginBottom: spacing.xs,
  },
  userTailLTR: {
    borderBottomRightRadius: radius.sm,
  },
  userTailRTL: {
    borderBottomLeftRadius: radius.sm,
  },
  assistantTailLTR: {
    borderBottomLeftRadius: radius.sm,
  },
  assistantTailRTL: {
    borderBottomRightRadius: radius.sm,
  },
  userConnectionLTR: {
    borderTopRightRadius: radius.sm,
  },
  userConnectionRTL: {
    borderTopLeftRadius: radius.sm,
  },
  assistantConnectionLTR: {
    borderTopLeftRadius: radius.sm,
  },
  assistantConnectionRTL: {
    borderTopRightRadius: radius.sm,
  },
});
