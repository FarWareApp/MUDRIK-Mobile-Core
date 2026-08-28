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
      } catch {
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
        if (!project) {
          return;
        }

        const cleanName =
          name.trim();

        if (!cleanName) {
          return;
        }

        const now =
          Date.now();

        setBusy(true);

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
        } finally {
          setBusy(false);
        }
      },
      [
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
          picked.length === 0
        ) {
          return;
        }

        setBusy(true);

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
        } catch {
          await attachmentCleanup
            .cleanupOrphans();

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
        projectAttachmentRepository,
        projectId,
      ],
    );

  const addMedia =
    useCallback(async () => {
      await importAttachments(
        await attachmentPicker
          .pickMedia(),
      );
    }, [
      attachmentPicker,
      importAttachments,
    ]);

  const addDocument =
    useCallback(async () => {
      await importAttachments(
        await attachmentPicker
          .pickDocuments(),
      );
    }, [
      attachmentPicker,
      importAttachments,
    ]);

  const takePhoto =
    useCallback(async () => {
      await importAttachments(
        await attachmentPicker
          .takePhoto(),
      );
    }, [
      attachmentPicker,
      importAttachments,
    ]);

  const removeAttachment =
    useCallback(
      async (
        attachment:
          AttachmentRecord,
      ) => {
        const next =
          attachments.filter(
            (item) =>
              item.id !==
              attachment.id,
          );

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
      },
      [
        attachmentCleanup,
        attachments,
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
        const linked =
          linkedConversationIds
            .includes(
              conversationId,
            );

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
      },
      [
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
