import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { useAccessibility } from '../../../core/accessibility/AccessibilityProvider';
import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { motion } from '../../../design-system/tokens/motion';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typography } from '../../../design-system/tokens/typography';
import { VoiceBackIcon } from './VoiceBackIcon';

export function VoiceScreenHeader() {
  const { colors } = useTheme();
  const { reducedMotion } = useAccessibility();
  const { t, isRTL } = useLocale();

  return (
    <View
      style={[
        styles.container,
        {
          borderBottomColor: colors.border,
          backgroundColor: 'transparent',
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('back')}
        onPress={() => router.back()}
        style={({ pressed }) => [
          styles.backButton,
          {
            backgroundColor: pressed
              ? colors.surfacePressed
              : colors.surface,
            borderColor: pressed
              ? colors.accentSoft
              : colors.border,
            shadowColor: colors.shadow,
            shadowOpacity:
              pressed ? 0.04 : 0.07,
            transform: [
              {
                scale:
                  pressed && !reducedMotion
                    ? motion.press.subtleScale
                    : 1,
              },
            ],
          },
        ]}
      >
        <VoiceBackIcon
          color={colors.textPrimary}
          isRTL={isRTL}
        />
      </Pressable>

      <Text
        accessibilityRole="header"
        style={[
          styles.title,
          { color: colors.textPrimary },
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
  backButton: {
    width: 44,
    height: 44,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.heading,
    fontWeight: '800',
  },
  spacer: {
    width: 44,
  },
});
