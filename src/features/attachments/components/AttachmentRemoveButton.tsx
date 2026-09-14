import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';

import { AttachmentRemoveIcon } from './AttachmentRemoveIcon';

type Props = {
  disabled: boolean;
  onPress: () => void;
};

export function AttachmentRemoveButton({
  disabled,
  onPress,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('removeAttachment')}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.touchTarget,
        {
          opacity: disabled
            ? 0.4
            : pressed
              ? 0.7
              : 1,
        },
      ]}
    >
      <View
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.visual,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
      >
        <AttachmentRemoveIcon
          color={colors.textPrimary}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchTarget: {
    position: 'absolute',
    top: -8,
    end: -8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  visual: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
