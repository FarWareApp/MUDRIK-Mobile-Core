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
import {
  normalizeProjectId,
} from '../../features/projects/ProjectId';

export default function ProjectDetailRoute() {
  const params =
    useLocalSearchParams<{
      id?: string | string[];
    }>();

  const rawId = params.id;

  const projectId =
    normalizeProjectId(
      Array.isArray(rawId)
        ? rawId[0]
        : rawId,
    ) ?? '';

  return (
    <ProjectDetailScreen
      projectId={projectId}
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
