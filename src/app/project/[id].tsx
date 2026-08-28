import React from 'react';

import {
  useLocalSearchParams,
} from 'expo-router';

import {
  appServices,
} from '../../core/composition/AppServices';

import {
  ProjectDetailScreen,
} from '../../features/projects/ProjectDetailScreen';

export default function ProjectDetailRoute() {
  const { id } =
    useLocalSearchParams<{
      id: string;
    }>();

  return (
    <ProjectDetailScreen
      projectId={id}
      projectRepository={
        appServices.projectRepository
      }
      projectAttachmentRepository={
        appServices
          .projectAttachmentRepository
      }
      projectConversationRepository={
        appServices
          .projectConversationRepository
      }
      conversationRepository={
        appServices
          .conversationRepository
      }
      attachmentPicker={
        appServices.attachmentPicker
      }
      attachmentImporter={
        appServices
          .attachmentImportService
      }
      attachmentCleanup={
        appServices
          .attachmentCleanupService
      }
    />
  );
}
