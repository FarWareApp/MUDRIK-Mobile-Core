import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { ChatMessage } from '../types';

type Props = {
  message: ChatMessage;
};

export function MessageBubble({
  message,
}: Props) {
  const { colors } = useTheme();

  const isUser = message.role === 'user';

  return (
    <View
      style={[
        styles.bubble,
        {
          alignSelf: isUser
            ? 'flex-end'
            : 'flex-start',

          backgroundColor: isUser
            ? colors.accent
            : colors.surfaceElevated,
        },
      ]}
    >
      <Text
        selectable
        style={[
          styles.text,
          {
            color: isUser
              ? colors.accentText
              : colors.textPrimary,
          },
        ]}
      >
        {message.text}
      </Text>
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

  text: {
    fontSize: 16,
    lineHeight: 23,
    writingDirection: 'auto',
  },
});
