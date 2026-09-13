import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import type { DiagnosticRepository } from '../../../contracts/DiagnosticRepository';
import type { DiagnosticEvent } from '../../../contracts/Diagnostics';
import { diagnosticsService } from '../../../core/diagnostics/DiagnosticsService';

export type DiagnosticsErrorCode =
  | 'load'
  | 'clear'
  | 'maintenance';

type MaintenanceResult = {
  orphanAttachmentsRemoved: number;
};

type Args = {
  repository: DiagnosticRepository;
  runAttachmentMaintenance: () => Promise<MaintenanceResult>;
};

const DIAGNOSTIC_LIMIT = 100;

export function useDiagnosticsController({
  repository,
  runAttachmentMaintenance,
}: Args) {
  const [events, setEvents] = useState<DiagnosticEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] =
    useState<DiagnosticsErrorCode | null>(null);
  const [maintenanceRemovedCount, setMaintenanceRemovedCount] =
    useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const stored = await repository.list(DIAGNOSTIC_LIMIT);
      const merged = new Map<string, DiagnosticEvent>();

      for (const event of [
        ...stored,
        ...diagnosticsService.snapshot(),
      ]) {
        merged.set(event.id, event);
      }

      setEvents(
        [...merged.values()]
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, DIAGNOSTIC_LIMIT),
      );
      setErrorCode(null);
    } catch {
      setErrorCode('load');
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    void load();
  }, [load]);

  const clearDiagnostics = useCallback(async () => {
    setBusy(true);

    try {
      diagnosticsService.clear();
      await repository.clear();
      setEvents([]);
      setErrorCode(null);
    } catch {
      setErrorCode('clear');
    } finally {
      setBusy(false);
    }
  }, [repository]);

  const runMaintenance = useCallback(async () => {
    setBusy(true);
    setMaintenanceRemovedCount(null);

    try {
      const result = await runAttachmentMaintenance();
      setMaintenanceRemovedCount(result.orphanAttachmentsRemoved);
      setErrorCode(null);
    } catch {
      setErrorCode('maintenance');
    } finally {
      setBusy(false);
    }
  }, [runAttachmentMaintenance]);

  const dismissError = useCallback(() => {
    setErrorCode(null);
  }, []);

  return {
    events,
    loading,
    busy,
    errorCode,
    maintenanceRemovedCount,
    load,
    clearDiagnostics,
    runMaintenance,
    dismissError,
  };
}
