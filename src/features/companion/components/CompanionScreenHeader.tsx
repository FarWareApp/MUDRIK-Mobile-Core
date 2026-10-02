import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import {
  router,
} from 'expo-router';

import {
  useLocale,
} from '../../../core/localization/LocaleProvider';
import {
  FlagshipIconButton,
} from '../../../design-system/components/FlagshipIconButton';
import {
  FlagshipHeaderIdentity,
} from '../../../design-system/components/FlagshipHeaderIdentity';
import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';
import {
  spacing,
} from '../../../design-system/tokens/spacing';
import {
  CompanionBackIcon,
} from './CompanionBackIcon';
import {
  CompanionEditIcon,
} from './CompanionEditIcon';

type Props = {
  disabled?: boolean;
  onEdit: () => void;
};

export function CompanionScreenHeader({
  disabled = false,
  onEdit,
}: Props) {
  const { colors } = useTheme();
  const {
    isRTL,
    t,
  } = useLocale();

  return (
    <View
      style={[
        styles.container,
        {
          borderBottomColor:
            colors.border,
          backgroundColor:
            'transparent',
        },
      ]}
    >
      <FlagshipIconButton
        accessibilityLabel={t('back')}
        renderIcon={(color) => (
          <CompanionBackIcon
            color={color}
            isRTL={isRTL}
          />
        )}
        onPress={() => router.back()}
      />
      <FlagshipHeaderIdentity
        title={t('companion')}
      />

      <FlagshipIconButton
        accessibilityLabel={
          t('editCompanion')
        }
        disabled={disabled}
        renderIcon={(color) => (
          <CompanionEditIcon
            color={color}
          />
        )}
        onPress={onEdit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
  },
});
