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
  failed: boolean;
  onRetry: () => void;
};

export function ChatBootstrapState({
  failed,
  onRetry,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  return (
    <View style={styles.container}>
      {failed ? (
        <>
          <Text
            style={[
              styles.error,
              {
                color: colors.textPrimary,
              },
            ]}
          >
            {t('restoreConversationFailed')}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('retry')}
            onPress={onRetry}
            style={[
              styles.retryButton,
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
        </>
      ) : (
        <>
          <ActivityIndicator
            color={colors.accent}
          />

          <Text
            style={[
              styles.loading,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            {t('restoringConversation')}
          </Text>
        </>
      )}
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

  loading: {
    marginTop: 12,
    fontSize: 14,
  },

  error: {
    fontSize: 16,
    textAlign: 'center',
  },

  retryButton: {
    marginTop: 18,
    minHeight: 44,
    paddingHorizontal: 22,
    justifyContent: 'center',
    borderRadius: 22,
  },
});
