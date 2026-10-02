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

      <Text
        accessibilityRole="header"
        numberOfLines={2}
        style={[
          styles.title,
          {
            color:
              colors.textPrimary,
          },
        ]}
      >
        {t('capabilitiesTitle')}
      </Text>

      <View style={styles.spacer} />
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
    paddingVertical: spacing.sm,
  },
  title: {
    ...typeScale.heading,
    flex: 1,
    paddingHorizontal: spacing.sm,
    textAlign: 'center',
    fontWeight: '800',
    writingDirection: 'auto',
  },
  spacer: {
    width: 44,
  },
});
