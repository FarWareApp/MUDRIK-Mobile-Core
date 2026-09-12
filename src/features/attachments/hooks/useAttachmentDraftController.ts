import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  AttachmentRecord,
  PickedAttachment,
} from '../../../contracts/Attachment';
import {
  AttachmentPicker,
} from '../../../contracts/AttachmentPicker';
import {
  AttachmentRepository,
} from '../../../contracts/AttachmentRepository';
import {
  diagnosticsService,
} from '../../../core/diagnostics/DiagnosticsService';

import {
  AttachmentImportService,
} from '../AttachmentImportService';
import {
  AttachmentFileStore,
} from '../storage/AttachmentFileStore';

type Dependencies = {
  conversationId: string | null;

  picker: AttachmentPicker;

  repository:
    AttachmentRepository;

  importer:
    AttachmentImportService;

  fileStore:
    AttachmentFileStore;
};

function recordAttachmentError(
  event: string,
  caught: unknown,
): void {
  diagnosticsService.record(
    'attachment-draft',
    caught instanceof Error
      ? `${event}:${caught.message}`
      : `${event}:unknown`,
    'error',
  );
}

export function useAttachmentDraftController({
  conversationId,
  picker,
  repository,
  importer,
  fileStore,
}: Dependencies) {
  const [
    attachments,
    setAttachments,
  ] = useState<AttachmentRecord[]>([]);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const load = useCallback(async () => {
    await Promise.resolve();

    if (!conversationId) {
      setAttachments([]);
      return;
    }

    try {
      const stored =
        await repository.listForDraft(
          conversationId,
        );

      const available =
        stored.filter((attachment) =>
          fileStore.exists(
            attachment.localUri,
          ),
        );

      setAttachments(available);

      if (
        available.length !==
        stored.length
      ) {
        await repository
          .setDraftAttachments(
            conversationId,
            available.map(
              (attachment) =>
                attachment.id,
            ),
          );

        diagnosticsService.record(
          'attachment-draft',
          `removed-missing:${stored.length - available.length}`,
          'warning',
        );
      }

      setError(null);
    } catch (caught) {
      recordAttachmentError(
        'restore-failed',
        caught,
      );

      setError(
        'Unable to restore attachments.',
      );
    }
  }, [
    conversationId,
    fileStore,
    repository,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const importPicked =
    useCallback(
      async (
        picked:
          PickedAttachment[],
      ) => {
        if (
          !conversationId ||
          picked.length === 0
        ) {
          return;
        }

        setBusy(true);
        setError(null);

        try {
          const imported =
            await importer.importMany(
              picked,
            );

          const next = [
            ...attachments,
            ...imported,
          ];

          await repository
            .setDraftAttachments(
              conversationId,
              next.map(
                (item) => item.id,
              ),
            );

          setAttachments(next);
        } catch (caught) {
          recordAttachmentError(
            'import-failed',
            caught,
          );

          setError(
            'Unable to add attachment.',
          );
        } finally {
          setBusy(false);
        }
      },
      [
        attachments,
        conversationId,
        importer,
        repository,
      ],
    );

  const pickMedia =
    useCallback(async () => {
      try {
        const picked =
          await picker.pickMedia();

        await importPicked(picked);
      } catch (caught) {
        recordAttachmentError(
          'media-picker-failed',
          caught,
        );

        setError(
          'Unable to open photos.',
        );
      }
    }, [
      importPicked,
      picker,
    ]);

  const takePhoto =
    useCallback(async () => {
      try {
        const picked =
          await picker.takePhoto();

        await importPicked(picked);
      } catch (caught) {
        recordAttachmentError(
          'camera-failed',
          caught,
        );

        setError(
          'Camera permission or capture failed.',
        );
      }
    }, [
      importPicked,
      picker,
    ]);

  const pickDocuments =
    useCallback(async () => {
      try {
        const picked =
          await picker.pickDocuments();

        await importPicked(picked);
      } catch (caught) {
        recordAttachmentError(
          'document-picker-failed',
          caught,
        );

        setError(
          'Unable to open files.',
        );
      }
    }, [
      importPicked,
      picker,
    ]);

  const remove =
    useCallback(
      async (
        attachment:
          AttachmentRecord,
      ) => {
        if (!conversationId) {
          return;
        }

        const next =
          attachments.filter(
            (item) =>
              item.id !==
              attachment.id,
          );

        try {
          await repository
            .setDraftAttachments(
              conversationId,
              next.map(
                (item) => item.id,
              ),
            );

          fileStore.delete(
            attachment.localUri,
          );

          await repository.delete(
            attachment.id,
          );

          setAttachments(next);
        } catch (caught) {
          recordAttachmentError(
            'remove-failed',
            caught,
          );

          setError(
            'Unable to remove attachment.',
          );
        }
      },
      [
        attachments,
        conversationId,
        fileStore,
        repository,
      ],
    );

  const clearLocalState =
    useCallback(() => {
      setAttachments([]);
      setError(null);
    }, []);

  return {
    attachments,
    busy,
    error,

    pickMedia,
    takePhoto,
    pickDocuments,
    remove,

    dismissError: () =>
      setError(null),

    clearLocalState,
    reload: load,
  };
}
