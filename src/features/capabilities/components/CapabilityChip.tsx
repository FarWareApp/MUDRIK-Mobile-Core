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
} from '../../../design-system/tokens/typography';

type Props = {
  label: string;
  count?: number;
};

export function CapabilityChip({
  label,
  count,
}: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor:
            colors.surfaceInput,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        importantForAccessibility="no"
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
          styles.label,
          {
            color:
              colors.textPrimary,
          },
        ]}
      >
        {label}
      </Text>
      {count !== undefined ? (
        <Text
          style={[
            styles.count,
            {
              color: colors.accent,
            },
          ]}
        >
          {count}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
  },
  label: {
    ...typeScale.caption,
    fontWeight: '700',
    writingDirection: 'auto',
  },
  count: {
    ...typeScale.caption,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
});
