import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typography } from '../../../design-system/tokens/typography';

type Props = {
  mode: 'loading' | 'error' | 'not-found';
  errorMessage?: string | null;
  onRetry?: () => void;
};

export function ProjectDetailState({
  mode,
  errorMessage,
  onRetry,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor:
              mode === 'error'
                ? colors.error
                : colors.border,
            shadowColor: colors.shadow,
          },
        ]}
      >
        {mode === 'loading' ? (
          <ActivityIndicator color={colors.accent} />
        ) : null}

        <Text
          accessibilityRole={mode === 'error' ? 'alert' : undefined}
          style={[
            styles.body,
            {
              color:
                mode === 'error'
                  ? colors.textPrimary
                  : colors.textSecondary,
            },
          ]}
        >
          {mode === 'loading'
            ? t('loadingProject')
            : mode === 'error'
              ? errorMessage || t('projectLoadFailed')
              : t('projectNotFound')}
        </Text>

        {mode === 'error' && onRetry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('retryLoadingProject')}
            onPress={onRetry}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: colors.accent,
                opacity: pressed ? 0.86 : 1,
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
        ) : null}

        {mode !== 'loading' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('backToProjects')}
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor: pressed
                  ? colors.surfacePressed
                  : 'transparent',
              },
            ]}
          >
            <Text
              style={{
                color: colors.accent,
                fontWeight: '700',
              }}
            >
              {t('back')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    elevation: 1,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },
  body: {
    marginTop: spacing.sm,
    fontSize: typography.secondary,
    lineHeight: 20,
    textAlign: 'center',
  },
  primaryButton: {
    minHeight: 44,
    marginTop: spacing.lg,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  backButton: {
    minHeight: 44,
    marginTop: spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
});
