import React from 'react';
import {
  StyleSheet,
  TextInput,
} from 'react-native';

import { useLocale } from '../../../../core/localization/LocaleProvider';
import { resolveTextDirection } from '../../../../core/localization/TextDirectionResolver';
import { useTheme } from '../../../../design-system/theme/ThemeProvider';
import { spacing } from '../../../../design-system/tokens/spacing';
import { typeScale } from '../../../../design-system/tokens/typography';

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
  const direction = resolveTextDirection(
    value,
    isRTL ? 'rtl' : 'ltr',
  );

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
      cursorColor={colors.accent}
      underlineColorAndroid="transparent"
      style={[
        styles.input,
        {
          color: colors.textPrimary,
          opacity: editable ? 1 : 0.62,
          textAlign: direction === 'rtl'
            ? 'right'
            : 'left',
          writingDirection: direction,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    ...typeScale.input,
    flex: 1,
    minHeight: 44,
    maxHeight: 128,
    paddingHorizontal: spacing.sm,
    paddingTop: 10,
    paddingBottom: 9,
    textAlignVertical: 'top',
  },
});
