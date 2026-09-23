import React, {
  useEffect,
  useState,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAccessibility } from '../../../core/accessibility/AccessibilityProvider';
import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { motion } from '../../../design-system/tokens/motion';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';

type Props = {
  active: boolean;
  disabled: boolean;
  onReset: () => void;
};

export function CompanionResetControl({
  active,
  disabled,
  onReset,
}: Props) {
  const { colors } = useTheme();
  const { reducedMotion } = useAccessibility();
  const { t } = useLocale();
  const [confirming, setConfirming] =
    useState(false);

  useEffect(() => {
    if (!active || disabled) {
      setConfirming(false);
    }
  }, [active, disabled]);

  const buttonStyle = (
    pressed: boolean,
  ) => [
    styles.button,
    {
      backgroundColor: pressed
        ? colors.surfacePressed
        : colors.surface,
      borderColor: colors.border,
      opacity: disabled ? 0.55 : 1,
      transform: [
        {
          scale:
            pressed
            && !disabled
            && !reducedMotion
              ? motion.press.subtleScale
              : 1,
        },
      ],
    },
  ];

  return (
    <View
      style={[
        styles.container,
        { borderColor: colors.border },
      ]}
    >
      <Text
        style={[
          styles.title,
          { color: colors.textPrimary },
        ]}
      >
        {t('companionResetTitle')}
      </Text>

      <Text
        style={[
          styles.description,
          { color: colors.textSecondary },
        ]}
      >
        {t('companionResetDescription')}
      </Text>

      <View style={styles.actions}>
        {confirming ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('cancelCompanionReset')}
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={() => setConfirming(false)}
              style={({ pressed }) =>
                buttonStyle(pressed)
              }
            >
              <Text
                style={[
                  styles.buttonText,
                  { color: colors.textSecondary },
                ]}
              >
                {t('cancelCompanionReset')}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('confirmCompanionReset')}
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={() => {
                setConfirming(false);
                onReset();
              }}
              style={({ pressed }) =>
                buttonStyle(pressed)
              }
            >
              <Text
                style={[
                  styles.buttonText,
                  { color: colors.error },
                ]}
              >
                {t('confirmCompanionReset')}
              </Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('resetCompanion')}
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={() => setConfirming(true)}
            style={({ pressed }) =>
              buttonStyle(pressed)
            }
          >
            <Text
              style={[
                styles.buttonText,
                { color: colors.error },
              ]}
            >
              {t('resetCompanion')}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  title: {
    ...typeScale.secondary,
    fontWeight: '700',
    writingDirection: 'auto',
  },
  description: {
    ...typeScale.caption,
    marginTop: spacing.xs,
    writingDirection: 'auto',
  },
  actions: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  button: {
    minHeight: 44,
    minWidth: 112,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
  },
  buttonText: {
    ...typeScale.secondary,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'auto',
  },
});
