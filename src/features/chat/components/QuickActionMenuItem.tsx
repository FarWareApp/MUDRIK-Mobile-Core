import React, {
  type ReactNode,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutDown,
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
  typeScale,
} from '../../../design-system/tokens/typography';

type Props = {
  label: string;
  icon: ReactNode;
  index: number;
  onPress: () => void;
};

export function QuickActionMenuItem({
  label,
  icon,
  index,
  onPress,
}: Props) {
  const { reducedMotion } =
    useAccessibility();
  const { isRTL } = useLocale();
  const { colors } = useTheme();

  return (
    <Animated.View
      entering={
        reducedMotion
          ? undefined
          : FadeInDown
              .duration(
                motion.duration.fast,
              )
              .delay(
                index
                * motion.stagger.compact,
              )
      }
      exiting={
        reducedMotion
          ? undefined
          : FadeOutDown.duration(
              motion.duration.quick,
            )
      }
    >
      <AdaptiveGlassSurface
        style={[
          styles.surface,
          {
            borderColor: colors.border,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={onPress}
          style={({ pressed }) => [
            styles.button,
            isRTL && styles.buttonRTL,
            {
              backgroundColor: pressed
                ? colors.surfacePressed
                : 'transparent',
              opacity: pressed ? 0.9 : 1,
              transform: [
                {
                  scale: pressed
                    ? motion.press.subtleScale
                    : 1,
                },
              ],
            },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              {
                color: colors.textPrimary,
                textAlign: isRTL
                  ? 'right'
                  : 'left',
              },
            ]}
          >
            {label}
          </Text>

          <View
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.iconContainer,
              {
                backgroundColor:
                  colors.accentSoft,
              },
            ]}
          >
            {icon}
          </View>
        </Pressable>
      </AdaptiveGlassSurface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 4,
  },
  button: {
    minWidth: 184,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    paddingStart: spacing.lg,
    paddingEnd: spacing.sm,
  },
  buttonRTL: {
    flexDirection: 'row-reverse',
  },
  label: {
    ...typeScale.secondary,
    flex: 1,
    fontWeight: '700',
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
