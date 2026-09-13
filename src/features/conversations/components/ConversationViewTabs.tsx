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

type ViewMode =
  | 'active'
  | 'archived';

type Props = {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
};

export function ConversationViewTabs({
  value,
  onChange,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  const renderTab = (
    mode: ViewMode,
    label: string,
  ) => {
    const selected =
      value === mode;

    return (
      <Pressable
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        onPress={() => onChange(mode)}
        style={({ pressed }) => [
          styles.tab,
          {
            backgroundColor: selected
              ? colors.surface
              : pressed
                ? colors.surfacePressed
                : 'transparent',
            borderColor: selected
              ? colors.border
              : 'transparent',
          },
        ]}
      >
        <Text
          style={[
            styles.tabText,
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
  };

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.container,
        {
          backgroundColor:
            colors.surfaceInput,
          borderColor: colors.border,
        },
      ]}
    >
      {renderTab(
        'active',
        t('activeConversations'),
      )}
      {renderTab(
        'archived',
        t('archivedConversations'),
      )}
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
  },

  tabText: {
    fontSize: typography.secondary,
    fontWeight: '700',
  },
});
