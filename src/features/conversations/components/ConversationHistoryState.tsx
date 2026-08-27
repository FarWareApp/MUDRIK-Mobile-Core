import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';

type Props = {
  mode:
    | 'loading'
    | 'error'
    | 'empty';

  onRetry?: () => void;
};

export function ConversationHistoryState({
  mode,
  onRetry,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  if (mode === 'loading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator
          color={colors.accent}
        />

        <Text
          style={[
            styles.body,
            {
              color: colors.textSecondary,
            },
          ]}
        >
          {t('loadingConversations')}
        </Text>
      </View>
    );
  }

  if (mode === 'error') {
    return (
      <View style={styles.container}>
        <Text
          style={[
            styles.body,
            {
              color: colors.textPrimary,
            },
          ]}
        >
          {t('conversationHistoryFailed')}
        </Text>

        {onRetry && (
          <Pressable
            onPress={onRetry}
            style={[
              styles.retry,
              {
                backgroundColor: colors.accent,
              },
            ]}
          >
            <Text
              style={{
                color: colors.accentText,
                fontWeight: '700',
              }}
            >
              {t('retry')}
            </Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.body,
          {
            color: colors.textSecondary,
          },
        ]}
      >
        {t('noConversations')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  body: {
    fontSize: 15,
    textAlign: 'center',
  },

  retry: {
    marginTop: 16,
    minHeight: 42,
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: 21,
  },
});
