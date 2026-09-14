import React, {
  memo,
  useCallback,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {
  ProjectRecord,
} from '../../../contracts/ProjectRepository';
import { useLocale } from '../../../core/localization/LocaleProvider';
import { useTheme } from '../../../design-system/theme/ThemeProvider';
import { spacing } from '../../../design-system/tokens/spacing';
import { typeScale } from '../../../design-system/tokens/typography';

import { formatProjectUpdatedAt } from '../formatters/formatProjectUpdatedAt';
import { ProjectArchiveIcon } from './ProjectArchiveIcon';
import { ProjectDeleteIcon } from './ProjectDeleteIcon';
import { ProjectListActionButton } from './ProjectListActionButton';
import { ProjectRestoreIcon } from './ProjectRestoreIcon';

type ProjectAction = (
  project: ProjectRecord,
) => void;

type Props = {
  project: ProjectRecord;
  disabled?: boolean;
  onOpen: ProjectAction;
  onArchive: ProjectAction;
  onDelete: ProjectAction;
};

export const ProjectListItem = memo(
  function ProjectListItem({
    project,
    disabled = false,
    onOpen,
    onArchive,
    onDelete,
  }: Props) {
    const { colors } = useTheme();
    const { locale, t, isRTL } = useLocale();

    const updatedAt = formatProjectUpdatedAt(
      project.updatedAt,
      locale,
    );

    const handleOpen = useCallback(
      () => onOpen(project),
      [onOpen, project],
    );
    const handleArchive = useCallback(
      () => onArchive(project),
      [onArchive, project],
    );
    const handleDelete = useCallback(
      () => onDelete(project),
      [onDelete, project],
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
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={handleOpen}
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
            icon={(color) =>
              project.isArchived ? (
                <ProjectRestoreIcon
                  color={color}
                  isRTL={isRTL}
                />
              ) : (
                <ProjectArchiveIcon color={color} />
              )
            }
            onPress={handleArchive}
          />

          <ProjectListActionButton
            accessibilityLabel={`${t('deleteProjectAction')}: ${project.name}`}
            disabled={disabled}
            tone="danger"
            icon={(color) => (
              <ProjectDeleteIcon color={color} />
            )}
            onPress={handleDelete}
          />
        </View>
      </View>
    );
  },
);

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
    marginStart: -spacing.sm,
    borderRadius: spacing.md,
  },
  name: {
    ...typeScale.body,
    fontWeight: '700',
    writingDirection: 'auto',
  },
  description: {
    ...typeScale.caption,
    marginTop: spacing.xs,
    writingDirection: 'auto',
  },
  date: {
    ...typeScale.caption,
    marginTop: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
