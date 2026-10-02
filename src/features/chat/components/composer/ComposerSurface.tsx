import React, {
  PropsWithChildren,
  ReactNode,
} from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import {
  LinearGradient,
} from 'expo-linear-gradient';

import {
  AdaptiveGlassSurface,
} from '../../../../design-system/components/AdaptiveGlassSurface';
import {
  useTheme,
} from '../../../../design-system/theme/ThemeProvider';
import {
  depth,
} from '../../../../design-system/tokens/depth';
import {
  flagshipPalette,
} from '../../../../design-system/tokens/flagship';
import {
  radius,
} from '../../../../design-system/tokens/radius';
import {
  spacing,
} from '../../../../design-system/tokens/spacing';

type Props = PropsWithChildren<{
  focused: boolean;
  footer?: ReactNode;
}>;

export function ComposerSurface({
  children,
  focused,
  footer,
}: Props) {
  const {
    colors,
    mode,
  } = useTheme();
  const palette =
    flagshipPalette[mode];

  return (
    <View
      style={[
        styles.wrapper,
        {
          borderTopColor:
            palette.hairline,
        },
      ]}
    >
      <View
        style={[
          styles.frame,
          focused
            ? depth.elevated
            : depth.subtle,
          {
            shadowColor:
              colors.shadow,
          },
        ]}
      >
        <LinearGradient
          colors={
            focused
              ? palette.heroStrong
              : palette.card
          }
          start={{
            x: 0.04,
            y: 0,
          }}
          end={{
            x: 0.96,
            y: 1,
          }}
          style={[
            styles.gradient,
            {
              borderColor:
                focused
                  ? palette.glow
                  : palette.hairline,
            },
          ]}
        >
          <AdaptiveGlassSurface
            fallbackColor="transparent"
            tintColor="transparent"
            style={styles.surface}
          >
            <View
              importantForAccessibility="no"
              pointerEvents="none"
              style={[
                styles.highlight,
                {
                  backgroundColor:
                    palette.shine,
                  opacity:
                    focused ? 0.82 : 0.46,
                },
              ]}
            />

            <LinearGradient
              importantForAccessibility="no"
              pointerEvents="none"
              colors={[
                'transparent',
                focused
                  ? colors.accent
                  : palette.metal,
                'transparent',
              ]}
              start={{
                x: 0,
                y: 0.5,
              }}
              end={{
                x: 1,
                y: 0.5,
              }}
              style={[
                styles.focusRail,
                {
                  opacity:
                    focused ? 0.7 : 0.22,
                },
              ]}
            />

            <View
              importantForAccessibility="no"
              pointerEvents="none"
              style={[
                styles.cornerPlate,
                {
                  borderColor:
                    palette.hairline,
                },
              ]}
            />

            <View
              style={styles.content}
            >
              {children}
            </View>
          </AdaptiveGlassSurface>
        </LinearGradient>
      </View>

      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth:
      StyleSheet.hairlineWidth,
    backgroundColor:
      'transparent',
  },
  frame: {
    borderRadius: radius.xxl,
  },
  gradient: {
    overflow: 'hidden',
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.xxl,
  },
  surface: {
    overflow: 'hidden',
    borderRadius: radius.xxl,
  },
  content: {
    minHeight: 64,
    maxHeight: 164,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    padding: spacing.sm,
    zIndex: 2,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    start: 26,
    end: 26,
    height: 1,
    borderRadius: radius.pill,
  },
  focusRail: {
    position: 'absolute',
    bottom: 0,
    start: 32,
    end: 32,
    height: 1,
  },
  cornerPlate: {
    position: 'absolute',
    top: 10,
    end: 12,
    width: 46,
    height: 30,
    borderTopWidth:
      StyleSheet.hairlineWidth,
    borderEndWidth:
      StyleSheet.hairlineWidth,
    borderTopEndRadius:
      radius.lg,
    opacity: 0.45,
  },
});
