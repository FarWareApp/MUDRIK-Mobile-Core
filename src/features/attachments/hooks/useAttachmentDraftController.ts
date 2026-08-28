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
    if (!conversationId) {
      setAttachments([]);
      return;
    }

    try {
      const stored =
        await repository.listForDraft(
          conversationId,
        );

      setAttachments(stored);
      setError(null);
    } catch {
      setError(
        'Unable to restore attachments.',
      );
    }
  }, [
    conversationId,
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
        } catch {
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
      } catch {
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
      } catch {
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
        const detail =
          caught instanceof Error
            ? caught.message
            : 'Unknown error';

        console.error(
          'DOCUMENT_PICKER_ERROR',
          caught,
        );

        setError(
          `Unable to open files: ${detail}`,
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
        } catch {
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
