import { diagnosticsService } from '../diagnostics/DiagnosticsService';
import { getDatabase } from './Database';
import { runMigrations } from './MigrationRunner';

let initializationPromise: Promise<void> | null = null;

async function initialize(): Promise<void> {
  diagnosticsService.record(
    'storage',
    'initialization-start',
  );

  try {
    const database = await getDatabase();

    await runMigrations(database);

    diagnosticsService.record(
      'storage',
      'initialization-complete',
    );
  } catch (error) {
    diagnosticsService.record(
      'storage',
      error instanceof Error
        ? `initialization-failed:${error.message}`
        : 'initialization-failed:unknown',
      'error',
    );

    throw error;
  }
}

export function initializeStorage(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = initialize().catch(
      (error) => {
        initializationPromise = null;
        throw error;
      },
    );
  }

  return initializationPromise;
}
