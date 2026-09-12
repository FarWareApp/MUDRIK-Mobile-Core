import type {
  AttachmentRepository,
} from '../../contracts/AttachmentRepository';

import type {
  AttachmentFileStore,
} from './storage/AttachmentFileStore';

export class AttachmentCleanupService {
  constructor(
    private readonly repository:
      AttachmentRepository,

    private readonly fileStore:
      AttachmentFileStore,
  ) {}

  async cleanupOrphans():
    Promise<number> {
    const orphans =
      await this.repository.listOrphans();

    let cleaned = 0;

    for (const attachment of orphans) {
      try {
        if (
          this.fileStore.exists(
            attachment.localUri,
          )
        ) {
          this.fileStore.delete(
            attachment.localUri,
          );
        }

        await this.repository.delete(
          attachment.id,
        );

        cleaned += 1;
      } catch {
        // Continue cleaning other
        // orphaned attachments.
      }
    }

    return cleaned;
  }
}
