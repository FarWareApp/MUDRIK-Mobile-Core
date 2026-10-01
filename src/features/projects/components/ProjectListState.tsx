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
import { motion } from '../../../design-system/tokens/motion';
import { radius } from '../../../design-system/tokens/radius';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';
import { ProjectAddIcon } from './ProjectAddIcon';
import { ProjectEmptyIcon } from './ProjectEmptyIcon';

type Props = {
  mode:
    | 'loading'
    | 'error'
    | 'empty'
    | 'search-empty';
  onRetry?: () => void;
  onCreateProject?: () => void;
};

export function ProjectListState({
  mode,
  onRetry,
  onCreateProject,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();

  const borderColor =
    mode === 'error'
      ? colors.error
      : colors.border;
  const empty = mode === 'empty';

  const message =
    mode === 'loading'
      ? t('loadingProjects')
      : mode === 'error'
        ? t('projectHistoryFailed')
        : mode === 'search-empty'
          ? t('noProjectSearchResults')
          : t('noProjects');

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor,
            shadowColor: colors.shadow,
          },
        ]}
      >
        {mode === 'loading' ? (
          <ActivityIndicator
            accessibilityRole="progressbar"
            color={colors.accent}
          />
        ) : null}

        {empty ? (
          <View
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.emptyIconSurface,
              {
                backgroundColor:
                  colors.accentSoft,
              },
            ]}
          >
            <ProjectEmptyIcon
              color={colors.textSecondary}
              accentColor={colors.accent}
            />
          </View>
        ) : null}

        <Text
          accessibilityRole={
            mode === 'error'
              ? 'alert'
              : undefined
          }
          accessibilityLiveRegion={
            mode === 'error'
              ? 'assertive'
              : 'polite'
          }
          style={[
            styles.body,
            {
              color:
                mode === 'error' || empty
                  ? colors.textPrimary
                  : colors.textSecondary,
            },
            empty && styles.emptyTitle,
          ]}
        >
          {message}
        </Text>

        {empty && onCreateProject ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('createProject')}
            onPress={onCreateProject}
            style={({ pressed }) => [
              styles.create,
              {
                backgroundColor: colors.accent,
                opacity: pressed ? 0.86 : 1,
                transform: [
                  {
                    scale: pressed
                      ? motion.press.subtleScale
                      : 1,
                  },
                ],
              },
            ]}
          >
            <ProjectAddIcon
              color={colors.accentText}
            />
            <Text
              style={[
                styles.createLabel,
                {
                  color: colors.accentText,
                },
              ]}
            >
              {t('createProject')}
            </Text>
          </Pressable>
        ) : null}

        {mode === 'error' && onRetry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('retry')}
            onPress={onRetry}
            style={({ pressed }) => [
              styles.retry,
              {
                backgroundColor: colors.accent,
                opacity: pressed ? 0.86 : 1,
                transform: [
                  {
                    scale: pressed
                      ? motion.press.subtleScale
                      : 1,
                  },
                ],
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
    maxWidth: 340,
    minHeight: 132,
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
  emptyIconSurface: {
    width: 104,
    height: 104,
    marginBottom: spacing.lg,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    ...typeScale.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    writingDirection: 'auto',
  },
  emptyTitle: {
    ...typeScale.body,
    fontWeight: '700',
    marginTop: 0,
  },
  create: {
    minHeight: 48,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  createLabel: {
    ...typeScale.secondary,
    fontWeight: '700',
    writingDirection: 'auto',
  },
  retry: {
    minHeight: 44,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
});
