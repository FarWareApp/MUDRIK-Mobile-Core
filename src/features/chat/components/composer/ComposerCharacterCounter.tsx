import React from 'react';
import {
  StyleSheet,
  Text,
} from 'react-native';

import { useLocale } from '../../../../core/localization/LocaleProvider';
import { useTheme } from '../../../../design-system/theme/ThemeProvider';
import { spacing } from '../../../../design-system/tokens/spacing';
import { typeScale } from '../../../../design-system/tokens/typography';
import {
  MAX_MESSAGE_TEXT_LENGTH,
  shouldShowMessageTextCounter,
} from '../../messageTextPolicy';

type Props = {
  value: string;
};

export function ComposerCharacterCounter({
  value,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  if (!shouldShowMessageTextCounter(value)) {
    return null;
  }

  const overLimit =
    value.length > MAX_MESSAGE_TEXT_LENGTH;
  const counter =
    `${value.length} / ${MAX_MESSAGE_TEXT_LENGTH}`;

  return (
    <Text
      accessibilityLabel={`${t('messageLength')}: ${counter}`}
      style={[
        styles.counter,
        {
          color: overLimit
            ? colors.error
            : colors.textSecondary,
        },
      ]}
    >
      {counter}
    </Text>
  );
}

const styles = StyleSheet.create({
  counter: {
    ...typeScale.micro,
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
    marginHorizontal: spacing.sm,
    fontVariant: ['tabular-nums'],
    writingDirection: 'ltr',
  },
});
