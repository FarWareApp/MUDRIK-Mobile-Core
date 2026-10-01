import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {
  ProjectRecord,
} from '../../../contracts/ProjectRepository';
import {
  useLocale,
} from '../../../core/localization/LocaleProvider';
import {
  InsetSurfaceCard,
} from '../../../design-system/components/InsetSurfaceCard';
import {
  useTheme,
} from '../../../design-system/theme/ThemeProvider';
import {
  radius,
} from '../../../design-system/tokens/radius';
import {
  spacing,
} from '../../../design-system/tokens/spacing';
import {
  typeScale,
  typography,
} from '../../../design-system/tokens/typography';
import {
  formatProjectUpdatedAt,
} from '../formatters/formatProjectUpdatedAt';

type Props = {
  project: ProjectRecord;
  attachmentCount: number;
  linkedConversationCount: number;
};

type MetricProps = {
  label: string;
  value: string;
};

function Metric({
  label,
  value,
}: MetricProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.metric,
        {
          backgroundColor:
            colors.surfaceInput,
          borderColor: colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.metricValue,
          {
            color: colors.textPrimary,
          },
        ]}
      >
        {value}
      </Text>
      <Text
        style={[
          styles.metricLabel,
          {
            color:
              colors.textSecondary,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function ProjectWorkspaceOverview({
  project,
  attachmentCount,
  linkedConversationCount,
}: Props) {
  const { colors } = useTheme();
  const { locale, t } = useLocale();

  const updatedAt =
    formatProjectUpdatedAt(
      project.updatedAt,
      locale,
    );

  return (
    <InsetSurfaceCard
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text
            style={[
              styles.eyebrow,
              {
                color: colors.accent,
              },
            ]}
          >
            {t(
              'projectWorkspaceEyebrow',
            )}
          </Text>

          <Text
            numberOfLines={2}
            style={[
              styles.title,
              {
                color:
                  colors.textPrimary,
              },
            ]}
          >
            {project.name}
          </Text>
        </View>

        <View
          style={[
            styles.stateBadge,
            {
              backgroundColor:
                project.isArchived
                  ? colors.surfaceInput
                  : colors.accentSoft,
              borderColor:
                project.isArchived
                  ? colors.border
                  : colors.accentSoft,
            },
          ]}
        >
          <View
            style={[
              styles.stateDot,
              {
                backgroundColor:
                  project.isArchived
                    ? colors
                        .textSecondary
                    : colors.success,
              },
            ]}
          />
          <Text
            style={[
              styles.stateText,
              {
                color:
                  project.isArchived
                    ? colors
                        .textSecondary
                    : colors.accent,
              },
            ]}
          >
            {t(
              project.isArchived
                ? 'projectWorkspaceArchived'
                : 'projectWorkspaceActive',
            )}
          </Text>
        </View>
      </View>

      {project.description ? (
        <Text
          style={[
            styles.description,
            {
              color:
                colors.textSecondary,
            },
          ]}
        >
          {project.description}
        </Text>
      ) : null}

      <View style={styles.metrics}>
        <Metric
          label={t(
            'projectWorkspaceFiles',
          )}
          value={String(
            attachmentCount,
          )}
        />
        <Metric
          label={t(
            'projectWorkspaceConversations',
          )}
          value={String(
            linkedConversationCount,
          )}
        />
      </View>

      {updatedAt ? (
        <View
          style={[
            styles.updatedRail,
            {
              borderTopColor:
                colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.updatedLabel,
              {
                color:
                  colors.textSecondary,
              },
            ]}
          >
            {t(
              'projectWorkspaceUpdated',
            )}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              styles.updatedValue,
              {
                color:
                  colors.textPrimary,
              },
            ]}
          >
            {updatedAt}
          </Text>
        </View>
      ) : null}
    </InsetSurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent:
      'space-between',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: typography.micro,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: 0.7,
    writingDirection: 'auto',
  },
  title: {
    ...typeScale.title,
    marginTop: spacing.xs,
    fontWeight: '900',
    writingDirection: 'auto',
  },
  stateBadge: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
  },
  stateDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
  },
  stateText: {
    ...typeScale.caption,
    fontWeight: '800',
    writingDirection: 'auto',
  },
  description: {
    ...typeScale.secondary,
    marginTop: spacing.lg,
    writingDirection: 'auto',
  },
  metrics: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metric: {
    flex: 1,
    minHeight: 76,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  metricValue: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  metricLabel: {
    ...typeScale.caption,
    marginTop: spacing.xxs,
    fontWeight: '700',
    writingDirection: 'auto',
  },
  updatedRail: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    gap: spacing.md,
    borderTopWidth:
      StyleSheet.hairlineWidth,
  },
  updatedLabel: {
    ...typeScale.caption,
    fontWeight: '700',
    writingDirection: 'auto',
  },
  updatedValue: {
    ...typeScale.caption,
    flex: 1,
    textAlign: 'auto',
    fontVariant: ['tabular-nums'],
  },
});
