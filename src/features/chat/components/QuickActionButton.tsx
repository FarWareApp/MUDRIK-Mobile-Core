import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

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
  motion,
} from '../../../design-system/tokens/motion';
import {
  radius,
} from '../../../design-system/tokens/radius';
import {
  spacing,
} from '../../../design-system/tokens/spacing';

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export function QuickActionButton({
  expanded,
  onPress,
}: Props) {
  const { reducedMotion } =
    useAccessibility();
  const { t, isRTL } = useLocale();
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        t(
          expanded
            ? 'closeQuickActions'
            : 'quickActions',
        )
      }
      accessibilityState={{ expanded }}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isRTL
          ? styles.buttonRTL
          : styles.buttonLTR,
        {
          backgroundColor: expanded
            ? colors.accent
            : pressed
              ? colors.surfacePressed
              : colors.surface,
          borderColor: expanded
            ? colors.accent
            : pressed
              ? colors.accentSoft
              : colors.border,
          shadowColor: colors.shadow,
          shadowOpacity: pressed
            ? 0.12
            : 0.18,
          opacity: pressed ? 0.94 : 1,
          transform: [
            {
              scale:
                pressed && !reducedMotion
                  ? motion.press.scale
                  : 1,
            },
          ],
        },
      ]}
    >
      <Text
        importantForAccessibility="no"
        style={[
          styles.glyph,
          {
            color: expanded
              ? colors.accentText
              : colors.accent,
          },
        ]}
      >
        {expanded ? '×' : '+'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: spacing.xl,
    width: 54,
    height: 54,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 6,
    zIndex: 50,
  },
  buttonLTR: {
    right: spacing.lg,
  },
  buttonRTL: {
    left: spacing.lg,
  },
  glyph: {
    fontSize: 29,
    lineHeight: 31,
    fontWeight: '500',
  },
});
