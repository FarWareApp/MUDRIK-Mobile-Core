import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

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
  typeScale,
  typography,
} from '../../../design-system/tokens/typography';

type Props = {
  label: string;
  value: number;
  description: string;
  accent?: boolean;
};

export function CapabilityStatCard({
  label,
  value,
  description,
  accent = false,
}: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: accent
            ? colors.accentSoft
            : colors.surfaceInput,
          borderColor: accent
            ? colors.accentSoft
            : colors.border,
        },
      ]}
    >
      <View style={styles.topRow}>
        <Text
          style={[
            styles.value,
            {
              color: accent
                ? colors.accent
                : colors.textPrimary,
            },
          ]}
        >
          {value}
        </Text>

        <View
          importantForAccessibility="no"
          style={[
            styles.signal,
            {
              backgroundColor:
                accent
                  ? colors.accent
                  : colors.success,
            },
          ]}
        />
      </View>

      <Text
        style={[
          styles.label,
          {
            color:
              colors.textPrimary,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        numberOfLines={3}
        style={[
          styles.description,
          {
            color:
              colors.textSecondary,
          },
        ]}
      >
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 142,
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },
  value: {
    fontSize: typography.display,
    lineHeight: 38,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  signal: {
    width: 9,
    height: 9,
    borderRadius: radius.pill,
  },
  label: {
    ...typeScale.secondary,
    marginTop: spacing.sm,
    fontWeight: '800',
    writingDirection: 'auto',
  },
  description: {
    ...typeScale.micro,
    marginTop: spacing.xs,
    writingDirection: 'auto',
  },
});
