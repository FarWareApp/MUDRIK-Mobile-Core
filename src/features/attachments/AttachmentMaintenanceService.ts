import {
  AttachmentCleanupService,
} from './AttachmentCleanupService';

export type AttachmentMaintenanceResult = {
  orphanAttachmentsRemoved: number;
};

export class AttachmentMaintenanceService {
  constructor(
    private readonly cleanup:
      AttachmentCleanupService,
  ) {}

  async run():
    Promise<AttachmentMaintenanceResult> {
    const orphanAttachmentsRemoved =
      await this.cleanup.cleanupOrphans();

    return {
      orphanAttachmentsRemoved,
    };
  }

  async runStartupMaintenance():
    Promise<void> {
    await this.run();
  }
}
