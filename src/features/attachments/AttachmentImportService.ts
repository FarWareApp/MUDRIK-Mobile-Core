import {
  AttachmentRecord,
  PickedAttachment,
} from '../../contracts/Attachment';
import {
  AttachmentRepository,
} from '../../contracts/AttachmentRepository';
import {
  AttachmentFileStore,
} from './storage/AttachmentFileStore';
import {
  validateActualFileSize,
  validatePickedAttachment,
} from './AttachmentValidation';

function createAttachmentId(): string {
  return `attachment-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export class AttachmentImportService {
  constructor(
    private readonly repository:
      AttachmentRepository,

    private readonly fileStore:
      AttachmentFileStore,
  ) {}

  async import(
    picked: PickedAttachment,
  ): Promise<AttachmentRecord> {
    validatePickedAttachment(picked);

    const id =
      createAttachmentId();

    let localUri:
      | string
      | null = null;

    try {
      localUri =
        await this.fileStore.persist(
          picked.sourceUri,
          id,
          picked.name,
        );

      const actualSize =
        this.fileStore.getSize(localUri);

      if (actualSize === null) {
        throw new Error(
          'Imported attachment is missing',
        );
      }

      validateActualFileSize(
        picked.kind,
        actualSize,
      );

      const attachment:
        AttachmentRecord = {
          id,

          kind: picked.kind,
          source: picked.source,

          name: picked.name,
          mimeType: picked.mimeType,
          sizeBytes: actualSize,

          localUri,

          width: picked.width,
          height: picked.height,
          durationMs:
            picked.durationMs,

          createdAt: Date.now(),
        };

      await this.repository.save(
        attachment,
      );

      return attachment;
    } catch (error) {
      if (localUri) {
        try {
          this.fileStore.delete(
            localUri,
          );
        } catch {
          // Preserve the original import error.
        }
      }

      throw error;
    }
  }

  async importMany(
    picked:
      readonly PickedAttachment[],
  ): Promise<AttachmentRecord[]> {
    const imported:
      AttachmentRecord[] = [];

    try {
      for (const attachment of picked) {
        imported.push(
          await this.import(
            attachment,
          ),
        );
      }

      return imported;
    } catch (error) {
      for (const attachment of imported) {
        try {
          this.fileStore.delete(
            attachment.localUri,
          );

          await this.repository.delete(
            attachment.id,
          );
        } catch {
          // Best-effort rollback.
        }
      }

      throw error;
    }
  }
}
