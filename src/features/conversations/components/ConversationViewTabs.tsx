import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';

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

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            colors.surfaceElevated,
        },
      ]}
    >
      <Pressable
        onPress={() => onChange('active')}
        style={[
          styles.tab,
          value === 'active' && {
            backgroundColor: colors.surface,
          },
        ]}
      >
        <Text
          style={{
            color:
              value === 'active'
                ? colors.textPrimary
                : colors.textSecondary,
            fontWeight: '600',
          }}
        >
          {t('activeConversations')}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => onChange('archived')}
        style={[
          styles.tab,
          value === 'archived' && {
            backgroundColor: colors.surface,
          },
        ]}
      >
        <Text
          style={{
            color:
              value === 'archived'
                ? colors.textPrimary
                : colors.textSecondary,
            fontWeight: '600',
          }}
        >
          {t('archivedConversations')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 3,
  },

  tab: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
});
