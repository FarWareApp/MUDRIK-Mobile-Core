import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

import {
  useLocale,
} from '../../../core/localization/LocaleProvider';
import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';
import {
  spacing,
} from '../../../design-system/tokens/spacing';

import {
  QuickActionCompanionIcon,
} from './QuickActionCompanionIcon';
import {
  QuickActionConversationsIcon,
} from './QuickActionConversationsIcon';
import {
  QuickActionMenuItem,
} from './QuickActionMenuItem';
import {
  QuickActionProjectsIcon,
} from './QuickActionProjectsIcon';
import {
  QuickActionSettingsIcon,
} from './QuickActionSettingsIcon';

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
  const { colors } = useTheme();

  if (!visible) {
    return null;
  }

  const actions = [
    {
      label: t('conversations'),
      icon: (
        <QuickActionConversationsIcon
          color={colors.accent}
        />
      ),
      onPress: onConversations,
    },
    {
      label: t('projects'),
      icon: (
        <QuickActionProjectsIcon
          color={colors.accent}
        />
      ),
      onPress: onProjects,
    },
    {
      label: t('companion'),
      icon: (
        <QuickActionCompanionIcon
          color={colors.accent}
        />
      ),
      onPress: onCompanion,
    },
    {
      label: t('settings'),
      icon: (
        <QuickActionSettingsIcon
          color={colors.accent}
        />
      ),
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
            icon={action.icon}
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
