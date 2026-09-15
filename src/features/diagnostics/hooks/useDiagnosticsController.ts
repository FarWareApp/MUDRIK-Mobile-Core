import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { DiagnosticRepository } from '../../../contracts/DiagnosticRepository';
import type { DiagnosticEvent } from '../../../contracts/Diagnostics';
import { diagnosticsService } from '../../../core/diagnostics/DiagnosticsService';
import type { DiagnosticsErrorCode } from '../DiagnosticsErrorCode';
import {
  DIAGNOSTIC_EVENT_LIMIT,
  mergeDiagnosticEvents,
} from '../mergeDiagnosticEvents';

type MaintenanceResult = {
  orphanAttachmentsRemoved: number;
};

type Args = {
  repository: DiagnosticRepository;
  runAttachmentMaintenance: () => Promise<MaintenanceResult>;
};

type DiagnosticsOperation =
  | 'load'
  | 'clear'
  | 'maintenance';

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
  const operationRef = useRef<DiagnosticsOperation | null>(null);

  const load = useCallback(async () => {
    if (operationRef.current !== null) {
      return;
    }

    operationRef.current = 'load';
    setLoading(true);
    setErrorCode(null);

    try {
      const stored = await repository.list(
        DIAGNOSTIC_EVENT_LIMIT,
      );
      const runtime = diagnosticsService.snapshot();

      setEvents(
        mergeDiagnosticEvents(
          stored,
          runtime,
          DIAGNOSTIC_EVENT_LIMIT,
        ),
      );
    } catch {
      setErrorCode('load');
    } finally {
      operationRef.current = null;
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    void load();
  }, [load]);

  const clearDiagnostics = useCallback(async () => {
    if (operationRef.current !== null) {
      return;
    }

    operationRef.current = 'clear';
    setBusy(true);
    setErrorCode(null);

    try {
      await repository.clear();
      diagnosticsService.clear();
      setEvents([]);
    } catch {
      setErrorCode('clear');
    } finally {
      operationRef.current = null;
      setBusy(false);
    }
  }, [repository]);

  const runMaintenance = useCallback(async () => {
    if (operationRef.current !== null) {
      return;
    }

    operationRef.current = 'maintenance';
    setBusy(true);
    setErrorCode(null);
    setMaintenanceRemovedCount(null);

    try {
      const result = await runAttachmentMaintenance();
      setMaintenanceRemovedCount(
        result.orphanAttachmentsRemoved,
      );
    } catch {
      setErrorCode('maintenance');
    } finally {
      operationRef.current = null;
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
