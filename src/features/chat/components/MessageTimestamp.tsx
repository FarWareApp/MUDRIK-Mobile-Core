import React from 'react';
import {
  StyleSheet,
  Text,
} from 'react-native';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { spacing } from '../../../design-system/tokens/spacing';
import { formatMessageTime } from '../formatters/formatMessageTime';

type Props = {
  createdAt: number;
  isUser: boolean;
};

export function MessageTimestamp({
  createdAt,
  isUser,
}: Props) {
  const { colors } = useTheme();
  const { locale } = useLocale();

  const value = formatMessageTime(
    createdAt,
    locale,
  );

  if (value.length === 0) {
    return null;
  }

  return (
    <Text
      accessibilityLabel={value}
      style={[
        styles.timestamp,
        {
          color: isUser
            ? colors.accentText
            : colors.textSecondary,
        },
      ]}
    >
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  timestamp: {
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
    fontSize: 11,
    lineHeight: 15,
    opacity: 0.72,
    fontVariant: ['tabular-nums'],
  },
});
