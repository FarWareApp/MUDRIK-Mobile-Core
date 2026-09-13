import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

import {
  useLocale,
} from '../../../core/localization/LocaleProvider';
import {
  spacing,
} from '../../../design-system/tokens/spacing';

import {
  QuickActionMenuItem,
} from './QuickActionMenuItem';

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
  const { t, isRTL } = useLocale();

  if (!visible) {
    return null;
  }

  const actions = [
    {
      label: t('conversations'),
      symbol: '☰',
      onPress: onConversations,
    },
    {
      label: t('projects'),
      symbol: '□',
      onPress: onProjects,
    },
    {
      label: t('companion'),
      symbol: '◎',
      onPress: onCompanion,
    },
    {
      label: t('settings'),
      symbol: '⚙',
      onPress: onSettings,
    },
  ];

  return (
    <View
      accessibilityViewIsModal
      style={[
        styles.container,
        isRTL
          ? styles.containerRTL
          : styles.containerLTR,
      ]}
    >
      {actions.map(
        (action, index) => (
          <QuickActionMenuItem
            key={action.label}
            index={index}
            label={action.label}
            symbol={action.symbol}
            onPress={action.onPress}
          />
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 88,
    gap: spacing.sm,
    zIndex: 40,
  },
  containerLTR: {
    right: spacing.lg,
  },
  containerRTL: {
    left: spacing.lg,
  },
});
