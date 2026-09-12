import React, {
  useCallback,
  useState,
} from 'react';

import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  router,
  useFocusEffect,
} from 'expo-router';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  ProjectRecord,
  ProjectRepository,
} from '../../contracts/ProjectRepository';

import {
  useTheme,
} from '../../design-system/theme/ThemeProvider';
import {
  InlineErrorBanner,
} from '../../shared/components/InlineErrorBanner';

import {
  ProjectEditorModal,
} from './components/ProjectEditorModal';

import {
  ProjectListItem,
} from './components/ProjectListItem';

import {
  ProjectViewTabs,
} from './components/ProjectViewTabs';

import {
  useProjectsController,
} from './hooks/useProjectsController';

type Props = {
  repository:
    ProjectRepository;

  onProjectDeleted?:
    () => Promise<void>;
};

export function ProjectsScreen({
  repository,
  onProjectDeleted,
}: Props) {
  const { colors } =
    useTheme();

  const [createOpen, setCreateOpen] =
    useState(false);

  const controller =
    useProjectsController({
      repository,
      onProjectDeleted,
    });

  const loadProjects =
    controller.load;

  useFocusEffect(
    useCallback(() => {
      void loadProjects();
    }, [loadProjects]),
  );

  const openProject = (
    project: ProjectRecord,
  ) => {
    router.push({
      pathname:
        '/project/[id]',
      params: {
        id: project.id,
      },
    });
  };

  const confirmDelete = (
    project: ProjectRecord,
  ) => {
    Alert.alert(
      'Delete project',
      `Delete "${project.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void controller
              .deleteProject(
                project.id,
              );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor:
            colors.background,
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() =>
            router.back()
          }
          style={[
            styles.circle,
            {
              backgroundColor:
                colors.surfaceElevated,
            },
          ]}
        >
          <Text
            style={{
              color:
                colors.textPrimary,
              fontSize: 24,
            }}
          >
            ‹
          </Text>
        </Pressable>

        <Text
          style={[
            styles.title,
            {
              color:
                colors.textPrimary,
            },
          ]}
        >
          Projects
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create project"
          disabled={controller.busy}
          onPress={() =>
            setCreateOpen(true)
          }
          style={[
            styles.circle,
            {
              backgroundColor:
                colors.accent,
              opacity:
                controller.busy
                  ? 0.5
                  : 1,
            },
          ]}
        >
          <Text
            style={{
              color:
                colors.accentText,
              fontSize: 24,
            }}
          >
            +
          </Text>
        </Pressable>
      </View>

      {controller.error && (
        <InlineErrorBanner
          message={controller.error}
          onRetry={
            controller.projects.length === 0
              ? () => {
                  void loadProjects();
                }
              : undefined
          }
          onDismiss={
            controller.dismissError
          }
        />
      )}

      <TextInput
        accessibilityLabel="Search projects"
        value={controller.query}
        onChangeText={
          controller.setQuery
        }
        placeholder="Search projects"
        placeholderTextColor={
          colors.textSecondary
        }
        style={[
          styles.search,
          {
            backgroundColor:
              colors.surfaceElevated,
            color:
              colors.textPrimary,
          },
        ]}
      />

      <ProjectViewTabs
        value={
          controller.viewMode
        }
        onChange={
          controller.setViewMode
        }
      />

      {controller.loading &&
      controller.projects.length === 0 ? (
        <View style={styles.center}>
          <Text
            style={{
              color:
                colors.textSecondary,
            }}
          >
            Loading projects…
          </Text>
        </View>
      ) : controller.projects
          .length === 0 ? (
        <View style={styles.center}>
          <Text
            style={{
              color:
                controller.error
                  ? colors.error
                  : colors.textSecondary,
            }}
          >
            {controller.error
              ? 'Projects could not be loaded.'
              : 'No projects.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={
            controller.projects
          }
          keyExtractor={
            (item) => item.id
          }
          renderItem={({
            item,
          }) => (
            <ProjectListItem
              project={item}
              disabled={controller.busy}
              onOpen={() =>
                openProject(item)
              }
              onArchive={() => {
                void controller
                  .toggleArchived(
                    item,
                  );
              }}
              onDelete={() =>
                confirmDelete(item)
              }
            />
          )}
        />
      )}

      <ProjectEditorModal
        visible={createOpen}
        title="New project"
        onCancel={() =>
          setCreateOpen(false)
        }
        onSave={(
          name,
          description,
        ) => {
          void (async () => {
            const id =
              await controller
                .create(
                  name,
                  description,
                );

            if (!id) {
              return;
            }

            setCreateOpen(false);

            router.push({
              pathname:
                '/project/[id]',
              params: { id },
            });
          })();
        }}
      />
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },

    header: {
      minHeight: 62,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
    },

    circle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    title: {
      flex: 1,
      textAlign: 'center',
      fontSize: 18,
      fontWeight: '700',
    },

    search: {
      minHeight: 46,
      borderRadius: 15,
      marginHorizontal: 16,
      marginBottom: 12,
      paddingHorizontal: 14,
      fontSize: 15,
    },

    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent:
        'center',
      paddingHorizontal: 20,
    },
  });