import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typography } from '../../../design-system/tokens/typography';

import { ProjectViewMode } from '../hooks/useProjectsController';

type Props = {
  value: ProjectViewMode;
  onChange: (value: ProjectViewMode) => void;
};

export function ProjectViewTabs({
  value,
  onChange,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  const tabs: ReadonlyArray<{
    key: ProjectViewMode;
    label: string;
  }> = [
    {
      key: 'active',
      label: t('activeProjects'),
    },
    {
      key: 'archived',
      label: t('archivedProjects'),
    },
  ];

  return (
    <View
      role="tablist"
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
        },
      ]}
    >
      {tabs.map(({ key, label }) => {
        const selected = value === key;

        return (
          <Pressable
            key={key}
            role="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            onPress={() => onChange(key)}
            style={({ pressed }) => [
              styles.tab,
              {
                backgroundColor: selected
                  ? colors.surface
                  : pressed
                    ? colors.surfacePressed
                    : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: selected
                    ? colors.textPrimary
                    : colors.textSecondary,
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
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  label: {
    fontSize: typography.secondary,
    fontWeight: '600',
  },
});
