import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
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
import {
  typeScale,
} from '../../../design-system/tokens/typography';

export type DiagnosticsMode =
  | 'overview'
  | 'advanced';

type Props = {
  value: DiagnosticsMode;
  onChange: (
    value: DiagnosticsMode,
  ) => void;
};

export function DiagnosticsModeTabs({
  value,
  onChange,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  const tabs:
    readonly {
      key: DiagnosticsMode;
      label: string;
    }[] = [
      {
        key: 'overview',
        label:
          t('diagnosticsOverviewTab'),
      },
      {
        key: 'advanced',
        label:
          t('diagnosticsAdvancedTab'),
      },
    ];

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.container,
        {
          backgroundColor:
            colors.surfaceElevated,
          borderColor: colors.border,
        },
      ]}
    >
      {tabs.map(({ key, label }) => {
        const selected =
          value === key;

        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{
              selected,
            }}
            onPress={() =>
              onChange(key)
            }
            style={({ pressed }) => [
              styles.tab,
              {
                backgroundColor:
                  selected
                    ? colors.surface
                    : pressed
                      ? colors
                          .surfacePressed
                      : 'transparent',
                borderColor:
                  selected
                    ? colors.border
                    : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: selected
                    ? colors
                        .textPrimary
                    : colors
                        .textSecondary,
                },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  label: {
    ...typeScale.secondary,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'auto',
  },
});
