import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  AttachmentRecord,
} from '../../../contracts/Attachment';

import {
  AttachmentPicker,
} from '../../../contracts/AttachmentPicker';

import {
  ConversationRecord,
  ConversationRepository,
} from '../../../contracts/ConversationRepository';

import {
  ProjectAttachmentRepository,
} from '../../../contracts/ProjectAttachmentRepository';

import {
  ProjectConversationRepository,
} from '../../../contracts/ProjectConversationRepository';

import {
  ProjectRecord,
  ProjectRepository,
} from '../../../contracts/ProjectRepository';
import {
  diagnosticsService,
} from '../../../core/diagnostics/DiagnosticsService';

import {
  AttachmentCleanupService,
} from '../../attachments/AttachmentCleanupService';

import {
  AttachmentImportService,
} from '../../attachments/AttachmentImportService';

type Dependencies = {
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

function recordProjectError(
  event: string,
  caught: unknown,
): void {
  diagnosticsService.record(
    'project-detail',
    caught instanceof Error
      ? `${event}:${caught.message}`
      : `${event}:unknown`,
    'error',
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
    useState<ProjectRecord | null>(
      null,
    );

  const [
    attachments,
    setAttachments,
  ] = useState<
    AttachmentRecord[]
  >([]);

  const [
    conversations,
    setConversations,
  ] = useState<
    ConversationRecord[]
  >([]);

  const [
    linkedConversationIds,
    setLinkedConversationIds,
  ] = useState<string[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const load =
    useCallback(async () => {
      setLoading(true);

      try {
        const [
          projectRecord,
          projectFiles,
          linkedIds,
          allConversations,
        ] = await Promise.all([
          projectRepository
            .getById(projectId),

          projectAttachmentRepository
            .list(projectId),

          projectConversationRepository
            .listConversationIds(
              projectId,
            ),

          conversationRepository
            .list(500),
        ]);

        setProject(
          projectRecord,
        );

        setAttachments(
          projectFiles,
        );

        setLinkedConversationIds(
          linkedIds,
        );

        setConversations(
          allConversations.filter(
            (conversation) =>
              !conversation
                .isArchived,
          ),
        );

        setError(null);
      } catch (caught) {
        recordProjectError(
          'load-failed',
          caught,
        );

        setError(
          'Unable to load project.',
        );
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
        if (!project || busy) {
          return false;
        }

        const cleanName =
          name.trim();

        if (!cleanName) {
          setError(
            'Project name cannot be empty.',
          );
          return false;
        }

        const now =
          Date.now();

        setBusy(true);
        setError(null);

        try {
          await projectRepository
            .rename(
              project.id,
              cleanName,
              now,
            );

          await projectRepository
            .updateDescription(
              project.id,
              description.trim(),
              now,
            );

          await load();
          return true;
        } catch (caught) {
          recordProjectError(
            'save-details-failed',
            caught,
          );

          setError(
            'Unable to save project details.',
          );
          return false;
        } finally {
          setBusy(false);
        }
      },
      [
        busy,
        load,
        project,
        projectRepository,
      ],
    );

  const importAttachments =
    useCallback(
      async (
        picked: Awaited<
          ReturnType<
            AttachmentPicker[
              'pickDocuments'
            ]
          >
        >,
      ) => {
        if (
          picked.length === 0 ||
          busy
        ) {
          return;
        }

        setBusy(true);
        setError(null);

        try {
          const imported =
            await attachmentImporter
              .importMany(picked);

          const next = [
            ...attachments,
            ...imported,
          ];

          await projectAttachmentRepository
            .setAttachments(
              projectId,
              next.map(
                (attachment) =>
                  attachment.id,
              ),
            );

          setAttachments(next);
        } catch (caught) {
          recordProjectError(
            'import-attachment-failed',
            caught,
          );

          try {
            await attachmentCleanup
              .cleanupOrphans();
          } catch (cleanupError) {
            recordProjectError(
              'cleanup-after-import-failed',
              cleanupError,
            );
          }

          setError(
            'Unable to add project file.',
          );
        } finally {
          setBusy(false);
        }
      },
      [
        attachmentCleanup,
        attachmentImporter,
        attachments,
        busy,
        projectAttachmentRepository,
        projectId,
      ],
    );

  const pickAndImport =
    useCallback(
      async (
        source:
          | 'media'
          | 'document'
          | 'camera',
      ) => {
        if (busy) {
          return;
        }

        try {
          const picked =
            source === 'media'
              ? await attachmentPicker
                  .pickMedia()
              : source === 'document'
                ? await attachmentPicker
                    .pickDocuments()
                : await attachmentPicker
                    .takePhoto();

          await importAttachments(
            picked,
          );
        } catch (caught) {
          recordProjectError(
            `${source}-picker-failed`,
            caught,
          );

          setError(
            source === 'camera'
              ? 'Camera permission or capture failed.'
              : source === 'media'
                ? 'Unable to open photos.'
                : 'Unable to open files.',
          );
        }
      },
      [
        attachmentPicker,
        busy,
        importAttachments,
      ],
    );

  const addMedia =
    useCallback(
      async () => {
        await pickAndImport(
          'media',
        );
      },
      [pickAndImport],
    );

  const addDocument =
    useCallback(
      async () => {
        await pickAndImport(
          'document',
        );
      },
      [pickAndImport],
    );

  const takePhoto =
    useCallback(
      async () => {
        await pickAndImport(
          'camera',
        );
      },
      [pickAndImport],
    );

  const removeAttachment =
    useCallback(
      async (
        attachment:
          AttachmentRecord,
      ) => {
        if (busy) {
          return;
        }

        const next =
          attachments.filter(
            (item) =>
              item.id !==
              attachment.id,
          );

        setBusy(true);
        setError(null);

        try {
          await projectAttachmentRepository
            .setAttachments(
              projectId,
              next.map(
                (item) =>
                  item.id,
              ),
            );

          setAttachments(next);

          await attachmentCleanup
            .cleanupOrphans();
        } catch (caught) {
          recordProjectError(
            'remove-attachment-failed',
            caught,
          );

          setError(
            'Unable to remove project file.',
          );
        } finally {
          setBusy(false);
        }
      },
      [
        attachmentCleanup,
        attachments,
        busy,
        projectAttachmentRepository,
        projectId,
      ],
    );

  const toggleConversation =
    useCallback(
      async (
        conversationId:
          string,
      ) => {
        if (busy) {
          return;
        }

        const linked =
          linkedConversationIds
            .includes(
              conversationId,
            );

        setBusy(true);
        setError(null);

        try {
          if (linked) {
            await projectConversationRepository
              .unlink(
                conversationId,
              );
          } else {
            await projectConversationRepository
              .link(
                projectId,
                conversationId,
              );
          }

          await load();
        } catch (caught) {
          recordProjectError(
            'toggle-conversation-failed',
            caught,
          );

          setError(
            'Unable to update linked conversation.',
          );
        } finally {
          setBusy(false);
        }
      },
      [
        busy,
        linkedConversationIds,
        load,
        projectConversationRepository,
        projectId,
      ],
    );

  return {
    project,
    attachments,
    conversations,
    linkedConversationIds,

    loading,
    busy,
    error,

    load,
    saveDetails,

    addMedia,
    addDocument,
    takePhoto,
    removeAttachment,

    toggleConversation,

    dismissError: () =>
      setError(null),
  };
}
