import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useTheme,
} from '../../design-system/theme/ThemeProvider';

type Props = {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
};

export function InlineErrorBanner({
  message,
  onRetry,
  onDismiss,
}: Props) {
  const { colors } = useTheme();

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.error,
        },
      ]}
    >
      <Text
        style={[
          styles.message,
          {
            color: colors.textPrimary,
          },
        ]}
      >
        {message}
      </Text>

      {onRetry && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry"
          onPress={onRetry}
          style={styles.action}
        >
          <Text
            style={{
              color: colors.accent,
              fontWeight: '700',
            }}
          >
            Retry
          </Text>
        </Pressable>
      )}

      {onDismiss && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss error"
          onPress={onDismiss}
          style={styles.action}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 18,
            }}
          >
            ×
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 14,
    marginBottom: 8,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
  },

  message: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },

  action: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
});
