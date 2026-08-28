import {
  appServices,
} from './AppServices';

export async function runAppMaintenance():
  Promise<void> {
  await appServices
    .attachmentMaintenanceService
    .runStartupMaintenance();
}
