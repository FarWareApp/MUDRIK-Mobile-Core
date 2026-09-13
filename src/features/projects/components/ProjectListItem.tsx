import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ProjectRecord } from '../../../contracts/ProjectRepository';
import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { spacing } from '../../../design-system/tokens/spacing';
import { typography } from '../../../design-system/tokens/typography';

import { formatProjectUpdatedAt } from '../formatters/formatProjectUpdatedAt';
import { ProjectListActionButton } from './ProjectListActionButton';

type Props = {
  project: ProjectRecord;
  disabled?: boolean;
  onOpen: () => void;
  onArchive: () => void;
  onDelete: () => void;
};

export function ProjectListItem({
  project,
  disabled = false,
  onOpen,
  onArchive,
  onDelete,
}: Props) {
  const { colors } = useTheme();
  const { locale, t } = useLocale();

  const updatedAt = formatProjectUpdatedAt(
    project.updatedAt,
    locale,
  );

  return (
    <View
      style={[
        styles.container,
        {
          borderBottomColor: colors.border,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('openProject')}: ${project.name}`}
        disabled={disabled}
        onPress={onOpen}
        style={({ pressed }) => [
          styles.main,
          {
            backgroundColor: pressed
              ? colors.surfacePressed
              : 'transparent',
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.name,
            { color: colors.textPrimary },
          ]}
        >
          {project.name}
        </Text>

        {project.description ? (
          <Text
            numberOfLines={2}
            style={[
              styles.description,
              { color: colors.textSecondary },
            ]}
          >
            {project.description}
          </Text>
        ) : null}

        {updatedAt ? (
          <Text
            numberOfLines={1}
            style={[
              styles.date,
              { color: colors.textSecondary },
            ]}
          >
            {updatedAt}
          </Text>
        ) : null}
      </Pressable>

      <View style={styles.actions}>
        <ProjectListActionButton
          accessibilityLabel={`${
            project.isArchived
              ? t('restoreProject')
              : t('archiveProject')
          }: ${project.name}`}
          disabled={disabled}
          onPress={onArchive}
        >
          {project.isArchived ? '↩' : '▣'}
        </ProjectListActionButton>

        <ProjectListActionButton
          accessibilityLabel={`${t('deleteProjectAction')}: ${project.name}`}
          disabled={disabled}
          tone="danger"
          onPress={onDelete}
        >
          ×
        </ProjectListActionButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 84,
    marginHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  main: {
    flex: 1,
    minHeight: 64,
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginLeft: -spacing.sm,
    borderRadius: spacing.md,
  },
  name: {
    fontSize: typography.body,
    fontWeight: '700',
  },
  description: {
    marginTop: spacing.xs,
    fontSize: typography.caption,
    lineHeight: 17,
  },
  date: {
    marginTop: spacing.xs,
    fontSize: typography.caption,
    fontVariant: ['tabular-nums'],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
