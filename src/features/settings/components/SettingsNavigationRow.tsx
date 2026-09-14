import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { spacing } from '../../../design-system/tokens/spacing';
import { typography } from '../../../design-system/tokens/typography';

import { SettingsNavigationChevronIcon } from './SettingsNavigationChevronIcon';

type Props = {
  title: string;
  description?: string;
  accessibilityLabel: string;
  onPress: () => void;
};

export function SettingsNavigationRow({
  title,
  description,
  accessibilityLabel,
  onPress,
}: Props) {
  const { colors } = useTheme();
  const { isRTL } = useLocale();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          borderBottomColor: colors.border,
          backgroundColor: pressed
            ? colors.surfacePressed
            : 'transparent',
        },
      ]}
    >
      <View style={styles.copy}>
        <Text
          style={[
            styles.title,
            { color: colors.textPrimary },
          ]}
        >
          {title}
        </Text>

        {description ? (
          <Text
            style={[
              styles.description,
              { color: colors.textSecondary },
            ]}
          >
            {description}
          </Text>
        ) : null}
      </View>

      <SettingsNavigationChevronIcon
        color={colors.textSecondary}
        isRTL={isRTL}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  copy: {
    flex: 1,
    paddingEnd: spacing.md,
  },
  title: {
    fontSize: typography.secondary,
    fontWeight: '600',
  },
  description: {
    marginTop: spacing.xs,
    fontSize: typography.caption,
    lineHeight: 17,
  },
});
