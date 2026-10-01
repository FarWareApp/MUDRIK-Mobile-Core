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
import { radius } from '../../../design-system/tokens/radius';
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
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.shadow,
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
    minHeight: 100,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.sm,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 2,
  },
  main: {
    flex: 1,
    minHeight: 82,
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
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
    gap: spacing.xxs,
  },
});
