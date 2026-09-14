import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import type {
  AttachmentRecord,
} from '../../../contracts/Attachment';
import type {
  AttachmentPicker,
} from '../../../contracts/AttachmentPicker';
import type {
  ConversationRecord,
  ConversationRepository,
} from '../../../contracts/ConversationRepository';
import type {
  ProjectAttachmentRepository,
} from '../../../contracts/ProjectAttachmentRepository';
import type {
  ProjectConversationRepository,
} from '../../../contracts/ProjectConversationRepository';
import type {
  ProjectRecord,
  ProjectRepository,
} from '../../../contracts/ProjectRepository';
import {
  diagnosticsService,
} from '../../../core/diagnostics/DiagnosticsService';

import type {
  AttachmentCleanupService,
} from '../../attachments/AttachmentCleanupService';
import type {
  AttachmentImportService,
} from '../../attachments/AttachmentImportService';
import type {
  ProjectDetailErrorCode,
} from '../ProjectDetailErrorCode';
import {
  selectProjectConversations,
} from '../projectConversationPolicy';

type Dependencies = {
  projectId: string;
  projectRepository: ProjectRepository;
  projectAttachmentRepository: ProjectAttachmentRepository;
  projectConversationRepository: ProjectConversationRepository;
  conversationRepository: ConversationRepository;
  attachmentPicker: AttachmentPicker;
  attachmentImporter: AttachmentImportService;
  attachmentCleanup: AttachmentCleanupService;
};

type AttachmentSource =
  | 'media'
  | 'document'
  | 'camera';

function recordProjectError(
  event: string,
  caught: unknown,
  level: 'warning' | 'error' = 'error',
): void {
  diagnosticsService.record(
    'project-detail',
    caught instanceof Error
      ? `${event}:${caught.message}`
      : `${event}:unknown`,
    level,
  );
}

export function useProjectDetailController({
  projectId,
  projectRepository,
  projectAttachmentRepository,
  projectConversationRepository,
  conversationRepository,
  attachmentPicker,
  attachmentImporter,
  attachmentCleanup,
}: Dependencies) {
  const [project, setProject] =
    useState<ProjectRecord | null>(null);

  const [attachments, setAttachments] =
    useState<AttachmentRecord[]>([]);

  const [conversations, setConversations] =
    useState<ConversationRecord[]>([]);

  const [linkedConversationIds, setLinkedConversationIds] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadFailed, setLoadFailed] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState<ProjectDetailErrorCode | null>(null);

  const mutationInFlightRef =
    useRef(false);

  const beginMutation =
    useCallback((): boolean => {
      if (mutationInFlightRef.current) {
        return false;
      }

      mutationInFlightRef.current = true;
      setBusy(true);
      setError(null);
      return true;
    }, []);

  const endMutation =
    useCallback(() => {
      mutationInFlightRef.current = false;
      setBusy(false);
    }, []);

  const load =
    useCallback(async () => {
      setLoading(true);
      setLoadFailed(false);
      setError(null);

      try {
        const [
          projectRecord,
          projectFiles,
          linkedIds,
          allConversations,
        ] = await Promise.all([
          projectRepository.getById(projectId),
          projectAttachmentRepository.list(projectId),
          projectConversationRepository.listConversationIds(
            projectId,
          ),
          conversationRepository.list(500),
        ]);

        setProject(projectRecord);
        setAttachments(projectFiles);
        setLinkedConversationIds(linkedIds);
        setConversations(
          selectProjectConversations(
            allConversations,
            linkedIds,
          ),
        );
      } catch (caught) {
        recordProjectError(
          'load-failed',
          caught,
        );
        setLoadFailed(true);
      } finally {
        setLoading(false);
      }
    }, [
      conversationRepository,
      projectAttachmentRepository,
      projectConversationRepository,
      projectId,
      projectRepository,
    ]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveDetails =
    useCallback(
      async (
        name: string,
        description: string,
      ) => {
        if (!project) {
          return false;
        }

        const cleanName = name.trim();

        if (!cleanName) {
          setError('name-required');
          return false;
        }

        if (!beginMutation()) {
          return false;
        }

        const cleanDescription =
          description.trim();
        const updatedAt = Date.now();

        try {
          await projectRepository.updateDetails(
            project.id,
            cleanName,
            cleanDescription,
            updatedAt,
          );

          setProject((current) =>
            current
              ? {
                  ...current,
                  name: cleanName,
                  description: cleanDescription,
                  updatedAt,
                }
              : current,
          );

          return true;
        } catch (caught) {
          recordProjectError(
            'save-details-failed',
            caught,
          );
          setError('save-details-failed');
          return false;
        } finally {
          endMutation();
        }
      },
      [
        beginMutation,
        endMutation,
        project,
        projectRepository,
      ],
    );

  const pickAndImport =
    useCallback(
      async (source: AttachmentSource) => {
        if (!beginMutation()) {
          return;
        }

        try {
          let picked: Awaited<
            ReturnType<AttachmentPicker['pickDocuments']>
          >;

          try {
            picked =
              source === 'media'
                ? await attachmentPicker.pickMedia()
                : source === 'document'
                  ? await attachmentPicker.pickDocuments()
                  : await attachmentPicker.takePhoto();
          } catch (caught) {
            recordProjectError(
              `${source}-picker-failed`,
              caught,
            );

            setError(
              source === 'camera'
                ? 'camera-failed'
                : source === 'media'
                  ? 'open-media-failed'
                  : 'open-files-failed',
            );
            return;
          }

          if (picked.length === 0) {
            return;
          }

          try {
            const imported =
              await attachmentImporter.importMany(picked);

            const next = [
              ...attachments,
              ...imported,
            ];

            await projectAttachmentRepository.setAttachments(
              projectId,
              next.map((attachment) => attachment.id),
            );

            setAttachments(next);
          } catch (caught) {
            recordProjectError(
              'import-attachment-failed',
              caught,
            );

            try {
              await attachmentCleanup.cleanupOrphans();
            } catch (cleanupError) {
              recordProjectError(
                'cleanup-after-import-failed',
                cleanupError,
                'warning',
              );
            }

            setError('add-file-failed');
          }
        } finally {
          endMutation();
        }
      },
      [
        attachmentCleanup,
        attachmentImporter,
        attachmentPicker,
        attachments,
        beginMutation,
        endMutation,
        projectAttachmentRepository,
        projectId,
      ],
    );

  const addMedia =
    useCallback(
      async () => {
        await pickAndImport('media');
      },
      [pickAndImport],
    );

  const addDocument =
    useCallback(
      async () => {
        await pickAndImport('document');
      },
      [pickAndImport],
    );

  const takePhoto =
    useCallback(
      async () => {
        await pickAndImport('camera');
      },
      [pickAndImport],
    );

  const removeAttachment =
    useCallback(
      async (attachment: AttachmentRecord) => {
        if (!beginMutation()) {
          return;
        }

        const next =
          attachments.filter(
            (item) => item.id !== attachment.id,
          );

        try {
          await projectAttachmentRepository.setAttachments(
            projectId,
            next.map((item) => item.id),
          );

          setAttachments(next);

          try {
            await attachmentCleanup.cleanupOrphans();
          } catch (cleanupError) {
            recordProjectError(
              'cleanup-after-remove-failed',
              cleanupError,
              'warning',
            );
          }
        } catch (caught) {
          recordProjectError(
            'remove-attachment-failed',
            caught,
          );
          setError('remove-file-failed');
        } finally {
          endMutation();
        }
      },
      [
        attachmentCleanup,
        attachments,
        beginMutation,
        endMutation,
        projectAttachmentRepository,
        projectId,
      ],
    );

  const toggleConversation =
    useCallback(
      async (conversationId: string) => {
        if (!beginMutation()) {
          return;
        }

        const linked =
          linkedConversationIds.includes(
            conversationId,
          );

        try {
          if (linked) {
            await projectConversationRepository.unlink(
              conversationId,
            );
          } else {
            await projectConversationRepository.link(
              projectId,
              conversationId,
            );
          }

          const nextLinkedIds =
            linked
              ? linkedConversationIds.filter(
                  (id) => id !== conversationId,
                )
              : [
                  conversationId,
                  ...linkedConversationIds.filter(
                    (id) => id !== conversationId,
                  ),
                ];

          setLinkedConversationIds(nextLinkedIds);
          setConversations((current) =>
            selectProjectConversations(
              current,
              nextLinkedIds,
            ),
          );
        } catch (caught) {
          recordProjectError(
            'toggle-conversation-failed',
            caught,
          );
          setError('conversation-update-failed');
        } finally {
          endMutation();
        }
      },
      [
        beginMutation,
        endMutation,
        linkedConversationIds,
        projectConversationRepository,
        projectId,
      ],
    );

  const dismissError =
    useCallback(() => {
      setError(null);
      setLoadFailed(false);
    }, []);

  return {
    project,
    attachments,
    conversations,
    linkedConversationIds,
    loading,
    failed: loadFailed,
    busy,
    error,
    load,
    saveDetails,
    addMedia,
    addDocument,
    takePhoto,
    removeAttachment,
    toggleConversation,
    dismissError,
  };
}
