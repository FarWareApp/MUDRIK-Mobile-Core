import {
  AttachmentCleanupService,
} from './AttachmentCleanupService';

export class AttachmentMaintenanceService {
  constructor(
    private readonly cleanup:
      AttachmentCleanupService,
  ) {}

  async runStartupMaintenance():
    Promise<void> {
    await this.cleanup.cleanupOrphans();
  }
}
