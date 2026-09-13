import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

import { useLocale } from '../../../../core/localization/LocaleProvider';
import { useTheme } from '../../../../design-system/theme/ThemeProvider';

import { ComposerActionButton } from './ComposerActionButton';

type Props = {
  disabled: boolean;
  onPress?: () => void;
};

export function ComposerVoiceButton({
  disabled,
  onPress,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  return (
    <ComposerActionButton
      accessibilityLabel={t('voice')}
      disabled={disabled}
      onPress={onPress}
    >
      <View
        importantForAccessibility="no-hide-descendants"
        style={styles.glyph}
      >
        <View
          style={[
            styles.capsule,
            { borderColor: colors.textSecondary },
          ]}
        />
        <View
          style={[
            styles.stem,
            { backgroundColor: colors.textSecondary },
          ]}
        />
        <View
          style={[
            styles.base,
            { backgroundColor: colors.textSecondary },
          ]}
        />
      </View>
    </ComposerActionButton>
  );
}

const styles = StyleSheet.create({
  glyph: {
    width: 20,
    height: 24,
    alignItems: 'center',
  },
  capsule: {
    width: 11,
    height: 16,
    borderWidth: 2,
    borderRadius: 6,
  },
  stem: {
    width: 2,
    height: 5,
  },
  base: {
    width: 11,
    height: 2,
    borderRadius: 1,
  },
});
