import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AttachmentPicker } from '../../contracts/AttachmentPicker';
import { ConversationRepository } from '../../contracts/ConversationRepository';
import { ProjectAttachmentRepository } from '../../contracts/ProjectAttachmentRepository';
import { ProjectConversationRepository } from '../../contracts/ProjectConversationRepository';
import { ProjectRepository } from '../../contracts/ProjectRepository';
import { useLocale } from '../../core/localization/LocaleProvider';
import { useTheme } from '../../design-system/theme/ThemeProvider';
import { spacing } from '../../design-system/tokens/spacing';
import { typography } from '../../design-system/tokens/typography';
import { InlineErrorBanner } from '../../shared/components/InlineErrorBanner';

import { AttachmentCleanupService } from '../attachments/AttachmentCleanupService';
import { AttachmentImportService } from '../attachments/AttachmentImportService';
import { ProjectAttachmentList } from './components/ProjectAttachmentList';
import { ProjectConversationList } from './components/ProjectConversationList';
import { ProjectDetailHeader } from './components/ProjectDetailHeader';
import { ProjectDetailState } from './components/ProjectDetailState';
import { ProjectEditorModal } from './components/ProjectEditorModal';
import { ProjectSectionHeader } from './components/ProjectSectionHeader';
import { useProjectDetailController } from './hooks/useProjectDetailController';

type Props = {
  projectId: string;
  projectRepository: ProjectRepository;
  projectAttachmentRepository: ProjectAttachmentRepository;
  projectConversationRepository: ProjectConversationRepository;
  conversationRepository: ConversationRepository;
  attachmentPicker: AttachmentPicker;
  attachmentImporter: AttachmentImportService;
  attachmentCleanup: AttachmentCleanupService;
};

export function ProjectDetailScreen(
  props: Props,
) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [editOpen, setEditOpen] = useState(false);
  const controller = useProjectDetailController(props);

  if (controller.loading && !controller.project) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          { backgroundColor: colors.background },
        ]}
      >
        <ProjectDetailState mode="loading" />
      </SafeAreaView>
    );
  }

  if (!controller.project) {
    const loadFailed = Boolean(controller.error);

    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          { backgroundColor: colors.background },
        ]}
      >
        <ProjectDetailState
          mode={loadFailed ? 'error' : 'not-found'}
          errorMessage={controller.error}
          onRetry={
            loadFailed
              ? () => {
                  void controller.load();
                }
              : undefined
          }
        />
      </SafeAreaView>
    );
  }

  const project = controller.project;

  const openAddMenu = () => {
    Alert.alert(
      t('addToProject'),
      undefined,
      [
        {
          text: t('photosAndVideos'),
          onPress: () => {
            void controller.addMedia();
          },
        },
        {
          text: t('camera'),
          onPress: () => {
            void controller.takePhoto();
          },
        },
        {
          text: t('files'),
          onPress: () => {
            void controller.addDocument();
          },
        },
        {
          text: t('cancel'),
          style: 'cancel',
        },
      ],
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colors.background },
      ]}
    >
      <ProjectDetailHeader
        title={project.name}
        busy={controller.busy}
        onEdit={() => setEditOpen(true)}
      />

      {controller.error ? (
        <InlineErrorBanner
          message={controller.error}
          onDismiss={controller.dismissError}
        />
      ) : null}

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {project.description ? (
          <Text
            style={[
              styles.description,
              { color: colors.textSecondary },
            ]}
          >
            {project.description}
          </Text>
        ) : null}

        <ProjectSectionHeader
          title={t('projectFiles')}
          actionLabel={t('addProjectFile')}
          actionText={`+ ${t('add')}`}
          disabled={controller.busy}
          onAction={openAddMenu}
        />

        <ProjectAttachmentList
          attachments={controller.attachments}
          disabled={controller.busy}
          onRemove={(attachment) => {
            void controller.removeAttachment(attachment);
          }}
        />

        <ProjectSectionHeader
          title={t('projectConversations')}
        />

        <ProjectConversationList
          conversations={controller.conversations}
          linkedIds={controller.linkedConversationIds}
          disabled={controller.busy}
          onToggle={(conversationId) => {
            void controller.toggleConversation(conversationId);
          }}
        />
      </ScrollView>

      <ProjectEditorModal
        visible={editOpen}
        title={t('editProject')}
        initialName={project.name}
        initialDescription={project.description}
        onCancel={() => setEditOpen(false)}
        onSave={(name, description) => {
          void (async () => {
            const saved = await controller.saveDetails(
              name,
              description,
            );

            if (saved) {
              setEditOpen(false);
            }
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
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.huge,
  },
  description: {
    fontSize: typography.secondary,
    lineHeight: 21,
    marginBottom: spacing.md,
  },
});
