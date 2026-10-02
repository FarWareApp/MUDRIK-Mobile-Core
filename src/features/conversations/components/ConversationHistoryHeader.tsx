import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  router,
} from 'expo-router';

import {
  useLocale,
} from '../../../core/localization/LocaleProvider';
import {
  FlagshipIconButton,
} from '../../../design-system/components/FlagshipIconButton';
import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';
import {
  spacing,
} from '../../../design-system/tokens/spacing';
import {
  typeScale,
} from '../../../design-system/tokens/typography';
import {
  ConversationAddIcon,
} from './ConversationAddIcon';
import {
  ConversationBackIcon,
} from './ConversationBackIcon';

type Props = {
  busy?: boolean;
  onNewConversation: () => void;
};

export function ConversationHistoryHeader({
  busy = false,
  onNewConversation,
}: Props) {
  const { colors } = useTheme();
  const {
    isRTL,
    t,
  } = useLocale();

  return (
    <View
      style={[
        styles.container,
        {
          borderBottomColor:
            colors.border,
          backgroundColor:
            'transparent',
        },
      ]}
    >
      <FlagshipIconButton
        accessibilityLabel={t('back')}
        renderIcon={(color) => (
          <ConversationBackIcon
            color={color}
            isRTL={isRTL}
          />
        )}
        onPress={() => router.back()}
      />

      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={[
          styles.title,
          {
            color:
              colors.textPrimary,
          },
        ]}
      >
        {t('conversations')}
      </Text>

      <FlagshipIconButton
        primary
        accessibilityLabel={
          t('newConversation')
        }
        disabled={busy}
        renderIcon={(color) => (
          <ConversationAddIcon
            color={color}
          />
        )}
        onPress={
          onNewConversation
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typeScale.heading,
    flex: 1,
    paddingHorizontal: spacing.sm,
    textAlign: 'center',
    fontWeight: '800',
  },
});
