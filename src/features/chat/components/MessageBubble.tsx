import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { resolveTextDirection } from '../../../core/localization/TextDirectionResolver';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import type { ChatMessage } from '../types';
import { MessageAttachmentList } from './MessageAttachmentList';
import { MessageTimestamp } from './MessageTimestamp';

type Props = {
  message: ChatMessage;
};

export function MessageBubble({
  message,
}: Props) {
  const { colors } = useTheme();
  const { isRTL } = useLocale();

  const isUser = message.role === 'user';

  const direction = resolveTextDirection(
    message.text,
    isRTL ? 'rtl' : 'ltr',
  );

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
      <MessageAttachmentList
        attachments={message.attachments ?? []}
      />

      {message.text.length > 0 && (
        <Text
          selectable
          style={[
            styles.text,
            {
              color: isUser
                ? colors.accentText
                : colors.textPrimary,
              writingDirection: direction,
              textAlign: direction === 'rtl'
                ? 'right'
                : 'left',
            },
          ]}
        >
          {message.text}
        </Text>
      )}

      <MessageTimestamp
        createdAt={message.createdAt}
        isUser={isUser}
      />
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
  },
});
