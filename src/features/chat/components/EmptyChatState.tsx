import React from 'react';
import {
  StyleSheet,
  Text,
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
  const { isRTL, t } = useLocale();

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
        style={[
          styles.logo,
          {
            borderColor: colors.border,
            shadowColor: colors.shadow,
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
      </AdaptiveGlassSurface>

      <Text
        style={[
          styles.title,
          {
            color: colors.textPrimary,
            textAlign: isRTL
              ? 'right'
              : 'left',
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
            textAlign: isRTL
              ? 'right'
              : 'left',
          },
        ]}
      >
        {t('emptyChatBody')}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.huge,
  },
  logo: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.xl,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },
  logoText: {
    fontSize: typography.title,
    lineHeight: 28,
    fontWeight: '900',
  },
  title: {
    fontSize: typography.title,
    lineHeight: 29,
    fontWeight: '800',
    writingDirection: 'auto',
  },
  body: {
    marginTop: spacing.sm,
    maxWidth: 420,
    fontSize: typography.secondary,
    lineHeight: 21,
    writingDirection: 'auto',
  },
});
