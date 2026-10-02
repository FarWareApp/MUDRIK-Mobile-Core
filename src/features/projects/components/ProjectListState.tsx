import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useLocale,
} from '../../../core/localization/LocaleProvider';
import {
  FlagshipActionButton,
} from '../../../design-system/components/FlagshipActionButton';
import {
  InsetSurfaceCard,
} from '../../../design-system/components/InsetSurfaceCard';
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
  ProjectEmptyCommandCenter,
} from './ProjectEmptyCommandCenter';

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

  if (
    mode === 'empty'
    && onCreateProject
  ) {
    return (
      <ProjectEmptyCommandCenter
        onCreateProject={
          onCreateProject
        }
      />
    );
  }

  const message =
    mode === 'loading'
      ? t('loadingProjects')
      : mode === 'error'
        ? t(
            'projectHistoryFailed',
          )
        : mode === 'search-empty'
          ? t(
              'noProjectSearchResults',
            )
          : t('noProjects');

  return (
    <View style={styles.container}>
      <InsetSurfaceCard
        style={[
          styles.card,
          mode === 'error'
            ? {
                borderColor:
                  colors.error,
              }
            : null,
        ]}
      >
        {mode === 'loading' ? (
          <ActivityIndicator
            accessibilityRole="progressbar"
            color={colors.accent}
          />
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
                mode === 'error'
                  ? colors.textPrimary
                  : colors.textSecondary,
            },
          ]}
        >
          {message}
        </Text>

        {mode === 'error'
        && onRetry ? (
          <FlagshipActionButton
            primary
            label={t('retry')}
            style={styles.retry}
            onPress={onRetry}
          />
        ) : null}
      </InsetSurfaceCard>
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
    maxWidth: 380,
    minHeight: 148,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  body: {
    ...typeScale.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    writingDirection: 'auto',
  },
  retry: {
    marginTop: spacing.lg,
  },
});
