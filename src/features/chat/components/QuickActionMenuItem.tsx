import React from 'react';
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
  useTheme,
} from '../../../design-system/theme/ThemeProvider';
import {
  radius,
} from '../../../design-system/tokens/radius';
import {
  spacing,
} from '../../../design-system/tokens/spacing';
import {
  typography,
} from '../../../design-system/tokens/typography';

type Props = {
  label: string;
  symbol: string;
  index: number;
  onPress: () => void;
};

export function QuickActionMenuItem({
  label,
  symbol,
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
              .duration(180)
              .delay(index * 28)
      }
      exiting={
        reducedMotion
          ? undefined
          : FadeOutDown.duration(110)
      }
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
              : colors.surface,
            borderColor: pressed
              ? colors.accentSoft
              : colors.border,
            shadowColor: colors.shadow,
            opacity: pressed ? 0.9 : 1,
            transform: [
              {
                scale: pressed ? 0.98 : 1,
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
            styles.symbol,
            {
              backgroundColor:
                colors.accentSoft,
            },
          ]}
        >
          <Text
            style={[
              styles.symbolText,
              { color: colors.accent },
            ]}
          >
            {symbol}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 184,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },
  buttonRTL: {
    flexDirection: 'row-reverse',
    paddingLeft: spacing.sm,
    paddingRight: spacing.lg,
  },
  label: {
    flex: 1,
    fontSize: typography.secondary,
    lineHeight: 20,
    fontWeight: '700',
  },
  symbol: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolText: {
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '700',
  },
});
