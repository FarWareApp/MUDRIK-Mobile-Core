import React, {
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  router,
} from 'expo-router';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  AttachmentPicker,
} from '../../contracts/AttachmentPicker';

import {
  ConversationRepository,
} from '../../contracts/ConversationRepository';

import {
  ProjectAttachmentRepository,
} from '../../contracts/ProjectAttachmentRepository';

import {
  ProjectConversationRepository,
} from '../../contracts/ProjectConversationRepository';

import {
  ProjectRepository,
} from '../../contracts/ProjectRepository';

import {
  useTheme,
} from '../../design-system/theme/ThemeProvider';

import {
  AttachmentCleanupService,
} from '../attachments/AttachmentCleanupService';

import {
  AttachmentImportService,
} from '../attachments/AttachmentImportService';

import {
  ProjectAttachmentList,
} from './components/ProjectAttachmentList';

import {
  ProjectConversationList,
} from './components/ProjectConversationList';

import {
  ProjectEditorModal,
} from './components/ProjectEditorModal';

import {
  useProjectDetailController,
} from './hooks/useProjectDetailController';

type Props = {
  projectId: string;

  projectRepository:
    ProjectRepository;

  projectAttachmentRepository:
    ProjectAttachmentRepository;

  projectConversationRepository:
    ProjectConversationRepository;

  conversationRepository:
    ConversationRepository;

  attachmentPicker:
    AttachmentPicker;

  attachmentImporter:
    AttachmentImportService;

  attachmentCleanup:
    AttachmentCleanupService;
};

export function ProjectDetailScreen(
  props: Props,
) {
  const { colors } =
    useTheme();

  const [editOpen, setEditOpen] =
    useState(false);

  const controller =
    useProjectDetailController(
      props,
    );

  if (controller.loading) {
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
        <View style={styles.center}>
          <ActivityIndicator
            color={colors.accent}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!controller.project) {
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
        <View style={styles.center}>
          <Text
            style={{
              color:
                colors.textSecondary,
            }}
          >
            Project not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const project =
    controller.project;

  const openAddMenu = () => {
    Alert.alert(
      'Add to project',
      undefined,
      [
        {
          text:
            'Photos & videos',
          onPress: () => {
            void controller
              .addMedia();
          },
        },
        {
          text: 'Camera',
          onPress: () => {
            void controller
              .takePhoto();
          },
        },
        {
          text: 'Files',
          onPress: () => {
            void controller
              .addDocument();
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
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
          numberOfLines={1}
          style={[
            styles.headerTitle,
            {
              color:
                colors.textPrimary,
            },
          ]}
        >
          {project.name}
        </Text>

        <Pressable
          onPress={() =>
            setEditOpen(true)
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
            }}
          >
            ✎
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
      >
        {!!project.description && (
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
        )}

        <View
          style={styles.sectionHeader}
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  colors.textPrimary,
              },
            ]}
          >
            Files
          </Text>

          <Pressable
            disabled={
              controller.busy
            }
            onPress={
              openAddMenu
            }
          >
            <Text
              style={{
                color:
                  colors.accent,
                fontWeight: '700',
              }}
            >
              + Add
            </Text>
          </Pressable>
        </View>

        <ProjectAttachmentList
          attachments={
            controller.attachments
          }
          onRemove={(
            attachment,
          ) => {
            void controller
              .removeAttachment(
                attachment,
              );
          }}
        />

        <View
          style={styles.sectionHeader}
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  colors.textPrimary,
              },
            ]}
          >
            Conversations
          </Text>
        </View>

        <ProjectConversationList
          conversations={
            controller.conversations
          }
          linkedIds={
            controller
              .linkedConversationIds
          }
          onToggle={(
            conversationId,
          ) => {
            void controller
              .toggleConversation(
                conversationId,
              );
          }}
        />
      </ScrollView>

      <ProjectEditorModal
        visible={editOpen}
        title="Edit project"
        initialName={
          project.name
        }
        initialDescription={
          project.description
        }
        onCancel={() =>
          setEditOpen(false)
        }
        onSave={(
          name,
          description,
        ) => {
          void (async () => {
            await controller
              .saveDetails(
                name,
                description,
              );

            setEditOpen(false);
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
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 18,
      fontWeight: '700',
      paddingHorizontal: 8,
    },

    content: {
      padding: 18,
      paddingBottom: 50,
    },

    description: {
      fontSize: 14,
      lineHeight: 21,
      marginBottom: 18,
    },

    sectionHeader: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginTop: 8,
    },

    sectionTitle: {
      fontSize: 17,
      fontWeight: '700',
    },

    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent:
        'center',
    },
  });
