import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';

type Props = {
  onNewConversation: () => void;
};

export function ConversationHistoryHeader({
  onNewConversation,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  return (
    <View
      style={[
        styles.container,
        {
          borderBottomColor: colors.border,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('back')}
        onPress={() => router.back()}
        style={[
          styles.circleButton,
          {
            backgroundColor:
              colors.surfaceElevated,
          },
        ]}
      >
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: 23,
          }}
        >
          ‹
        </Text>
      </Pressable>

      <Text
        accessibilityRole="header"
        style={[
          styles.title,
          {
            color: colors.textPrimary,
          },
        ]}
      >
        {t('conversations')}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('newConversation')}
        onPress={onNewConversation}
        style={[
          styles.circleButton,
          {
            backgroundColor: colors.accent,
          },
        ]}
      >
        <Text
          style={{
            color: colors.accentText,
            fontSize: 25,
          }}
        >
          +
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
  },

  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },

  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
