import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';

type Props = {
  message: string;
  onRetry: () => void;
  onDismiss: () => void;
};

export function ChatErrorBanner({
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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss error"
        onPress={onDismiss}
        style={styles.dismiss}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },

  message: {
    flex: 1,
    fontSize: 13,
  },

  action: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },

  dismiss: {
    paddingLeft: spacing.sm,
    paddingVertical: spacing.sm,
  },
});
