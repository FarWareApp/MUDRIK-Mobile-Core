import React from 'react';
import {
  StyleSheet,
  TextInput,
} from 'react-native';

import { useLocale } from '../../../../core/localization/LocaleProvider';
import { useTheme } from '../../../../design-system/theme/ThemeProvider';
import { spacing } from '../../../../design-system/tokens/spacing';
import { typography } from '../../../../design-system/tokens/typography';

type Props = {
  value: string;
  editable: boolean;
  onChangeText: (text: string) => void;
  onFocusChange: (focused: boolean) => void;
};

export function ComposerTextInput({
  value,
  editable,
  onChangeText,
  onFocusChange,
}: Props) {
  const { colors, mode } = useTheme();
  const { isRTL, t } = useLocale();

  return (
    <TextInput
      accessibilityLabel={t('composerPlaceholder')}
      value={value}
      onChangeText={onChangeText}
      onFocus={() => onFocusChange(true)}
      onBlur={() => onFocusChange(false)}
      editable={editable}
      multiline
      maxLength={12000}
      keyboardAppearance={mode}
      placeholder={t('composerPlaceholder')}
      placeholderTextColor={colors.textSecondary}
      selectionColor={colors.accent}
      style={[
        styles.input,
        {
          color: colors.textPrimary,
          opacity: editable ? 1 : 0.62,
          textAlign: isRTL ? 'right' : 'left',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 128,
    paddingHorizontal: spacing.sm,
    paddingTop: 10,
    paddingBottom: 9,
    fontSize: typography.body,
    lineHeight: 24,
    textAlignVertical: 'top',
    writingDirection: 'auto',
  },
});
