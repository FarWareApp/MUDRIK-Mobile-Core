import React from 'react';
import {
  StyleSheet,
  Text,
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
  useTheme,
} from '../../../design-system/theme/ThemeProvider';
import {
  spacing,
} from '../../../design-system/tokens/spacing';
import {
  typeScale,
} from '../../../design-system/tokens/typography';
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

      <Text
        accessibilityRole="header"
        style={[
          styles.title,
          {
            color:
              colors.textPrimary,
          },
        ]}
      >
        {t('companion')}
      </Text>

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
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typeScale.heading,
    flex: 1,
    textAlign: 'center',
    fontWeight: '800',
  },
});
