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
    <View
      pointerEvents="box-none"
      style={styles.container}
    >
      {actions.map((action) => (
        <Pressable
          key={action.key}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.action,
            {
              backgroundColor: pressed
                ? colors.surfacePressed
                : colors.surface,
              borderColor: pressed
                ? colors.accentSoft
                : colors.border,
              opacity: pressed ? 0.9 : 1,
              shadowColor: colors.shadow,
              transform: [
                { scale: pressed ? 0.98 : 1 },
              ],
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
              style={[
                styles.symbol,
                {
                  color: colors.textPrimary,
                },
              ]}
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
    bottom: 88,
    gap: 10,
    zIndex: 30,
    alignItems: 'flex-end',
  },

  action: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingLeft: 16,
    paddingRight: 6,
    elevation: 5,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 6,
    },
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 10,
  },

  symbolContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  symbol: {
    fontSize: 18,
    lineHeight: 21,
    fontWeight: '700',
  },
});
