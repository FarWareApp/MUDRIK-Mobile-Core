import React from 'react';
import {
  StyleSheet,
  Text,
} from 'react-native';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { resolveTextDirection } from '../../../core/localization/TextDirectionResolver';
import { useTheme } from '../../../design-system/theme/ThemeProvider';

type Props = {
  text: string;
  isUser: boolean;
};

export function MessageText({
  text,
  isUser,
}: Props) {
  const { colors } = useTheme();
  const { isRTL } = useLocale();

  const direction = resolveTextDirection(
    text,
    isRTL ? 'rtl' : 'ltr',
  );

  return (
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
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    lineHeight: 23,
  },
});
