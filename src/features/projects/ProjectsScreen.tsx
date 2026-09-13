import React, {
  useCallback,
  useState,
} from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
} from 'react-native';
import {
  router,
  useFocusEffect,
} from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ProjectRecord,
  ProjectRepository,
} from '../../contracts/ProjectRepository';
import { useLocale } from '../../core/localization/LocaleProvider';
import { useTheme } from '../../design-system/theme/ThemeProvider';
import { spacing } from '../../design-system/tokens/spacing';
import { InlineErrorBanner } from '../../shared/components/InlineErrorBanner';

import { ProjectEditorModal } from './components/ProjectEditorModal';
import { ProjectListItem } from './components/ProjectListItem';
import { ProjectListState } from './components/ProjectListState';
import { ProjectScreenHeader } from './components/ProjectScreenHeader';
import { ProjectSearchBar } from './components/ProjectSearchBar';
import { ProjectViewTabs } from './components/ProjectViewTabs';
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

  useFocusEffect(
    useCallback(() => {
      void loadProjects();
    }, [loadProjects]),
  );

  const openProject = (
    project: ProjectRecord,
  ) => {
    router.push({
      pathname: '/project/[id]',
      params: { id: project.id },
    });
  };

  const confirmDelete = (
    project: ProjectRecord,
  ) => {
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
            void controller.deleteProject(project.id);
          },
        },
      ],
    );
  };

  const hasProjects = controller.projects.length > 0;
  const stateMode =
    controller.loading && !hasProjects
      ? 'loading'
      : controller.error && !hasProjects
        ? 'error'
        : !hasProjects
          ? 'empty'
          : null;

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colors.background },
      ]}
    >
      <ProjectScreenHeader
        busy={controller.busy}
        onCreateProject={() => setCreateOpen(true)}
      />

      {controller.error && hasProjects ? (
        <InlineErrorBanner
          message={controller.error}
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
        <FlatList
          data={controller.projects}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <ProjectListItem
              project={item}
              disabled={controller.busy}
              onOpen={() => openProject(item)}
              onArchive={() => {
                void controller.toggleArchived(item);
              }}
              onDelete={() => confirmDelete(item)}
            />
          )}
        />
      )}

      <ProjectEditorModal
        visible={createOpen}
        title={t('newProject')}
        onCancel={() => setCreateOpen(false)}
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
});
