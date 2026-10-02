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
  typography,
} from '../../../design-system/tokens/typography';
import {
  VoiceBackIcon,
} from './VoiceBackIcon';

export function VoiceScreenHeader() {
  const { colors } = useTheme();
  const {
    t,
    isRTL,
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
          <VoiceBackIcon
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
        {t('voiceConversation')}
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
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize:
      typography.heading,
    fontWeight: '800',
  },
  spacer: {
    width: 44,
  },
});
