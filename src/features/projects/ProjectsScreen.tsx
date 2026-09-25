import React, {
  useCallback,
  useState,
} from 'react';
import {
  Alert,
} from 'react-native';
import {
  router,
  useFocusEffect,
} from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import type {
  ProjectRecord,
  ProjectRepository,
} from '../../contracts/ProjectRepository';
import { useLocale } from '../../core/localization/LocaleProvider';
import { useTheme } from '../../design-system/theme/ThemeProvider';
import { InlineErrorBanner } from '../../shared/components/InlineErrorBanner';

import { ProjectEditorModal } from './components/ProjectEditorModal';
import { ProjectList } from './components/ProjectList';
import { ProjectListState } from './components/ProjectListState';
import { ProjectScreenHeader } from './components/ProjectScreenHeader';
import { ProjectSearchBar } from './components/ProjectSearchBar';
import { ProjectViewTabs } from './components/ProjectViewTabs';
import { getProjectListErrorTranslationKey } from './getProjectListErrorTranslationKey';
import { useProjectsController } from './hooks/useProjectsController';

type Props = {
  repository: ProjectRepository;
  onProjectDeleted?: () => Promise<void>;
};

export function ProjectsScreen({
  repository,
  onProjectDeleted,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [createOpen, setCreateOpen] = useState(false);

  const controller = useProjectsController({
    repository,
    onProjectDeleted,
  });

  const loadProjects = controller.load;
  const deleteProject = controller.deleteProject;
  const toggleArchived = controller.toggleArchived;

  useFocusEffect(
    useCallback(() => {
      void loadProjects();
    }, [loadProjects]),
  );

  const openProject = useCallback(
    (project: ProjectRecord) => {
      router.push({
        pathname: '/project/[id]',
        params: { id: project.id },
      });
    },
    [],
  );

  const confirmDelete = useCallback(
    (project: ProjectRecord) => {
      Alert.alert(
        t('deleteProject'),
        `${t('deleteProjectMessage')}\n\n${project.name}`,
        [
          {
            text: t('cancel'),
            style: 'cancel',
          },
          {
            text: t('delete'),
            style: 'destructive',
            onPress: () => {
              void deleteProject(project.id);
            },
          },
        ],
      );
    },
    [deleteProject, t],
  );

  const archiveProject = useCallback(
    (project: ProjectRecord) => {
      void toggleArchived(project);
    },
    [toggleArchived],
  );

  const errorMessage =
    controller.error
      ? t(
          getProjectListErrorTranslationKey(
            controller.error,
          ),
        )
      : null;

  const hasProjects =
    controller.projects.length > 0;

  const stateMode =
    controller.loading && !hasProjects
      ? 'loading'
      : controller.failed && !hasProjects
        ? 'error'
        : !hasProjects
          ? controller.hasSearchQuery
            ? 'search-empty'
            : 'empty'
          : null;

  const inlineMessage =
    errorMessage
    ?? (controller.failed && hasProjects
      ? t('projectHistoryFailed')
      : null);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <ProjectScreenHeader
        busy={controller.busy}
        onCreateProject={() => {
          controller.dismissError();
          setCreateOpen(true);
        }}
      />

      {inlineMessage && !createOpen ? (
        <InlineErrorBanner
          message={inlineMessage}
          onDismiss={controller.dismissError}
        />
      ) : null}

      <ProjectSearchBar
        value={controller.query}
        onChangeText={controller.setQuery}
      />

      <ProjectViewTabs
        value={controller.viewMode}
        onChange={controller.setViewMode}
      />

      {stateMode ? (
        <ProjectListState
          mode={stateMode}
          onRetry={
            stateMode === 'error'
              ? () => {
                  void loadProjects();
                }
              : undefined
          }
        />
      ) : (
        <ProjectList
          projects={controller.projects}
          disabled={controller.busy}
          onOpen={openProject}
          onArchive={archiveProject}
          onDelete={confirmDelete}
        />
      )}

      <ProjectEditorModal
        visible={createOpen}
        title={t('newProject')}
        busy={controller.busy}
        errorMessage={errorMessage}
        onCancel={() => {
          controller.dismissError();
          setCreateOpen(false);
        }}
        onSave={(name, description) => {
          void (async () => {
            const id = await controller.create(
              name,
              description,
            );

            if (!id) {
              return;
            }

            setCreateOpen(false);
            router.push({
              pathname: '/project/[id]',
              params: { id },
            });
          })();
        }}
      />
    </SafeAreaView>
  );
}
