import React, {
  memo,
  type ReactNode,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useAccessibility,
} from '../../../core/accessibility/AccessibilityProvider';
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
  description: string;
  icon: ReactNode;
  primary?: boolean;
  onPress: () => void;
};

export const HomeCommandTile = memo(
  function HomeCommandTile({
    label,
    description,
    icon,
    primary = false,
    onPress,
  }: Props) {
  const { colors } = useTheme();
  const { reducedMotion } =
    useAccessibility();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        primary && styles.primaryTile,
        {
          backgroundColor: primary
            ? colors.accent
            : pressed
              ? colors.surfacePressed
              : colors.surface,
          borderColor: primary
            ? colors.accent
            : colors.border,
          shadowColor: colors.shadow,
          shadowOpacity: primary
            ? 0.14
            : 0.06,
          opacity: pressed ? 0.94 : 1,
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
      {primary ? (
        <View
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={styles.primaryDecoration}
        >
          <View
            style={[
              styles.primaryRingOuter,
              {
                borderColor:
                  colors.accentText,
              },
            ]}
          />
          <View
            style={[
              styles.primaryRingInner,
              {
                borderColor:
                  colors.accentText,
              },
            ]}
          />
        </View>
      ) : null}

      <View
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.icon,
          {
            backgroundColor: primary
              ? colors.accentText
              : colors.accentSoft,
          },
        ]}
      >
        {icon}
      </View>

      <Text
        numberOfLines={1}
        style={[
          styles.label,
          {
            color: primary
              ? colors.accentText
              : colors.textPrimary,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        numberOfLines={2}
        style={[
          styles.description,
          {
            color: primary
              ? colors.accentText
              : colors.textSecondary,
            opacity: primary ? 0.86 : 1,
          },
        ]}
      >
        {description}
      </Text>
    </Pressable>
  );
  },
);

const styles = StyleSheet.create({
  tile: {
    minHeight: 126,
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    padding: spacing.lg,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 2,
  },
  primaryTile: {
    flexBasis: '100%',
    minHeight: 118,
  },
  primaryDecoration: {
    position: 'absolute',
    top: -42,
    end: -30,
    width: 168,
    height: 168,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.18,
  },
  primaryRingOuter: {
    position: 'absolute',
    width: 168,
    height: 168,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  primaryRingInner: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typeScale.secondary,
    marginTop: spacing.md,
    fontWeight: '800',
    writingDirection: 'auto',
  },
  description: {
    ...typeScale.caption,
    marginTop: spacing.xs,
    writingDirection: 'auto',
  },
});
