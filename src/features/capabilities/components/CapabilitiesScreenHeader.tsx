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
  CapabilitiesBackIcon,
} from './CapabilitiesBackIcon';

export function CapabilitiesScreenHeader() {
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
          backgroundColor:
            'transparent',
          borderBottomColor:
            colors.border,
        },
      ]}
    >
      <FlagshipIconButton
        accessibilityLabel={t('back')}
        renderIcon={(color) => (
          <CapabilitiesBackIcon
            color={color}
            isRTL={isRTL}
          />
        )}
        onPress={() => router.back()}
      />
      <FlagshipHeaderIdentity
        title={t('capabilitiesTitle')}
        numberOfLines={2}
      />

      <View style={styles.spacer} />
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
    paddingVertical: spacing.sm,
  },
  spacer: {
    width: 44,
  },
});
