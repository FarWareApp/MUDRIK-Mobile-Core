import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeInUp,
} from 'react-native-reanimated';

import {
  useAccessibility,
} from '../../../core/accessibility/AccessibilityProvider';
import {
  useLocale,
} from '../../../core/localization/LocaleProvider';
import {
  AdaptiveGlassSurface,
} from '../../../design-system/components/AdaptiveGlassSurface';
import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';
import {
  motion,
} from '../../../design-system/tokens/motion';
import {
  radius,
} from '../../../design-system/tokens/radius';
import {
  spacing,
} from '../../../design-system/tokens/spacing';
import {
  typography,
} from '../../../design-system/tokens/typography';

export function EmptyChatState() {
  const { reducedMotion } =
    useAccessibility();
  const { colors } = useTheme();
  const { t } = useLocale();

  return (
    <Animated.View
      entering={
        reducedMotion
          ? undefined
          : FadeInUp.duration(
              motion.duration.standard,
            )
      }
      style={styles.container}
    >
      <AdaptiveGlassSurface
        fallbackColor={colors.surface}
        tintColor={colors.surface}
        style={[
          styles.hero,
          {
            borderColor: colors.border,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <View
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.logoHalo,
            {
              backgroundColor:
                colors.accentSoft,
            },
          ]}
        >
          <View
            style={[
              styles.logo,
              {
                backgroundColor:
                  colors.surface,
                borderColor:
                  colors.border,
              },
            ]}
          >
            <Text
              importantForAccessibility="no"
              style={[
                styles.logoText,
                {
                  color: colors.accent,
                },
              ]}
            >
              M
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.title,
            {
              color: colors.textPrimary,
            },
          ]}
        >
          {t('emptyChatTitle')}
        </Text>

        <Text
          style={[
            styles.body,
            {
              color: colors.textSecondary,
            },
          ]}
        >
          {t('emptyChatBody')}
        </Text>

        <View
          importantForAccessibility="no"
          style={[
            styles.accentLine,
            {
              backgroundColor:
                colors.accentSoft,
            },
          ]}
        >
          <View
            style={[
              styles.accentLineFill,
              {
                backgroundColor:
                  colors.accent,
              },
            ]}
          />
        </View>
      </AdaptiveGlassSurface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
  },
  hero: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth:
      StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 3,
  },
  logoHalo: {
    width: 84,
    height: 84,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xl,
    borderWidth:
      StyleSheet.hairlineWidth,
  },
  logoText: {
    fontSize: typography.title,
    lineHeight: 28,
    fontWeight: '900',
  },
  title: {
    fontSize: typography.title,
    lineHeight: 31,
    fontWeight: '800',
    textAlign: 'center',
    writingDirection: 'auto',
  },
  body: {
    marginTop: spacing.sm,
    maxWidth: 330,
    fontSize: typography.secondary,
    lineHeight: 21,
    textAlign: 'center',
    writingDirection: 'auto',
  },
  accentLine: {
    width: 70,
    height: 5,
    marginTop: spacing.xl,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  accentLineFill: {
    width: 24,
    height: 5,
    alignSelf: 'center',
    borderRadius: radius.pill,
  },
});
