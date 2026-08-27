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

type Action = {
  key: string;
  label: string;
  symbol: string;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  onConversations: () => void;
  onProjects: () => void;
  onCompanion: () => void;
  onSettings: () => void;
};

export function QuickActionMenu({
  visible,
  onConversations,
  onProjects,
  onCompanion,
  onSettings,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  if (!visible) {
    return null;
  }

  const actions: Action[] = [
    {
      key: 'conversations',
      label: t('conversations'),
      symbol: '☰',
      onPress: onConversations,
    },
    {
      key: 'projects',
      label: t('projects'),
      symbol: '□',
      onPress: onProjects,
    },
    {
      key: 'companion',
      label: t('companion'),
      symbol: '◎',
      onPress: onCompanion,
    },
    {
      key: 'settings',
      label: t('settings'),
      symbol: '⚙',
      onPress: onSettings,
    },
  ];

  return (
    <View style={styles.container}>
      {actions.map((action) => (
        <Pressable
          key={action.key}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={[
            styles.action,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.label,
              {
                color: colors.textPrimary,
              },
            ]}
          >
            {action.label}
          </Text>

          <View
            style={[
              styles.symbolContainer,
              {
                backgroundColor: colors.surfaceElevated,
              },
            ]}
          >
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 18,
              }}
            >
              {action.symbol}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 18,
    bottom: 86,
    gap: 8,
    zIndex: 30,
    alignItems: 'flex-end',
  },

  action: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingLeft: 16,
    paddingRight: 6,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 10,
  },

  symbolContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
