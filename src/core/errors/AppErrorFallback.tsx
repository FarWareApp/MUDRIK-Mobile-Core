import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import { resolveSystemLocale } from '../localization/resolveSystemLocale';
import {
  darkColors,
  lightColors,
} from '../../design-system/tokens/colors';
import { motion } from '../../design-system/tokens/motion';
import { radius } from '../../design-system/tokens/radius';
import { spacing } from '../../design-system/tokens/spacing';
import { typeScale } from '../../design-system/tokens/typography';
import { emergencyErrorTranslations } from './emergencyErrorTranslations';

type Props = {
  errorReference: string | null;
  onRetry: () => void;
};

export function AppErrorFallback({
  errorReference,
  onRetry,
}: Props) {
  const systemScheme = useColorScheme();
  const locale = resolveSystemLocale();
  const isRTL = locale === 'ar';
  const colors = systemScheme === 'light'
    ? lightColors
    : darkColors;
  const copy = emergencyErrorTranslations[locale];

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <Text
        style={[
          styles.title,
          {
            color: colors.textPrimary,
            writingDirection: isRTL ? 'rtl' : 'ltr',
          },
        ]}
      >
        {copy.title}
      </Text>

      <Text
        style={[
          styles.body,
          {
            color: colors.textSecondary,
            writingDirection: isRTL ? 'rtl' : 'ltr',
          },
        ]}
      >
        {copy.body}
      </Text>

      {errorReference ? (
        <Text
          selectable
          style={[
            styles.reference,
            {
              color: colors.textSecondary,
              writingDirection: isRTL ? 'rtl' : 'ltr',
            },
          ]}
        >
          {copy.referenceLabel}: {errorReference}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.retryAccessibility}
        onPress={onRetry}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: colors.accent,
            opacity: pressed ? 0.88 : 1,
            transform: [
              {
                scale: pressed
                  ? motion.press.scale
                  : 1,
              },
            ],
          },
        ]}
      >
        <Text
          style={[
            styles.buttonText,
            {
              color: colors.accentText,
              writingDirection: isRTL ? 'rtl' : 'ltr',
            },
          ]}
        >
          {copy.retry}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  title: {
    ...typeScale.title,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    ...typeScale.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  reference: {
    ...typeScale.micro,
    marginTop: spacing.md,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  button: {
    minHeight: 48,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  buttonText: {
    ...typeScale.secondary,
    fontWeight: '700',
  },
});
