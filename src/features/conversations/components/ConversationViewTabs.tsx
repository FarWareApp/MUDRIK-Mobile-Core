import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import type {
  ConversationViewMode,
} from '../ConversationViewMode';
import { ConversationViewTab } from './ConversationViewTab';

type Props = {
  value: ConversationViewMode;
  onChange: (value: ConversationViewMode) => void;
};

export function ConversationViewTabs({
  value,
  onChange,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

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
      <ConversationViewTab
        label={t('activeConversations')}
        selected={value === 'active'}
        onPress={() => onChange('active')}
      />

      <ConversationViewTab
        label={t('archivedConversations')}
        selected={value === 'archived'}
        onPress={() => onChange('archived')}
      />
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
});
