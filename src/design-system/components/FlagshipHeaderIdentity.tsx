import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  LinearGradient,
} from 'expo-linear-gradient';

import {
  useTheme,
} from '../theme/ThemeProvider';
import {
  flagshipPalette,
} from '../tokens/flagship';
import {
  radius,
} from '../tokens/radius';
import {
  spacing,
} from '../tokens/spacing';
import {
  typeScale,
  typography,
} from '../tokens/typography';

type Props = {
  title: string;
  numberOfLines?: number;
};

export function FlagshipHeaderIdentity({
  title,
  numberOfLines = 1,
}: Props) {
  const {
    colors,
    mode,
  } = useTheme();
  const palette =
    flagshipPalette[mode];

  return (
    <View style={styles.container}>
      <View
        style={styles.eyebrowRow}
        importantForAccessibility="no"
      >
        <View
          style={[
            styles.dot,
            {
              backgroundColor:
                colors.accent,
            },
          ]}
        />

        <Text
          style={[
            styles.eyebrow,
            {
              color: colors.accent,
            },
          ]}
        >
          MUDRIK
        </Text>

        <View
          style={[
            styles.metalTick,
            {
              backgroundColor:
                palette.metal,
            },
          ]}
        />
      </View>

      <Text
        accessibilityRole="header"
        numberOfLines={numberOfLines}
        style={[
          styles.title,
          {
            color:
              colors.textPrimary,
          },
        ]}
      >
        {title}
      </Text>

      <LinearGradient
        importantForAccessibility="no"
        pointerEvents="none"
        colors={[
          'transparent',
          palette.metal,
          colors.accent,
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
        style={styles.rail}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: radius.pill,
  },
  eyebrow: {
    fontSize: typography.micro,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  metalTick: {
    width: 18,
    height: 1,
    borderRadius: radius.pill,
    opacity: 0.66,
  },
  title: {
    ...typeScale.heading,
    width: '100%',
    marginTop: 2,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'auto',
  },
  rail: {
    width: 74,
    height: 1,
    marginTop: spacing.xs,
    opacity: 0.72,
    borderRadius: radius.pill,
  },
});
