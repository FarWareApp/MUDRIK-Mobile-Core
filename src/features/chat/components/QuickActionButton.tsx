import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

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

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export function QuickActionButton({
  expanded,
  onPress,
}: Props) {
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
          backgroundColor:
            colors.accent,
          shadowColor: colors.shadow,
          opacity: pressed ? 0.9 : 1,
          transform: [
            {
              scale: pressed ? 0.96 : 1,
            },
          ],
        },
      ]}
    >
      <Text
        importantForAccessibility="no"
        style={[
          styles.glyph,
          { color: colors.accentText },
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
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 7,
    zIndex: 50,
  },
  buttonLTR: {
    right: spacing.lg,
  },
  buttonRTL: {
    left: spacing.lg,
  },
  glyph: {
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '400',
  },
});
