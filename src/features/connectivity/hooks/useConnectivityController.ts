import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ConnectivitySnapshot,
  INITIAL_CONNECTIVITY,
} from '../../../contracts/Connectivity';

import {
  ConnectivityService,
} from '../../../contracts/ConnectivityService';
import {
  diagnosticsService,
} from '../../../core/diagnostics/DiagnosticsService';
import {
  ConnectivityErrorCode,
} from '../ConnectivityErrorCode';
import {
  shouldCommitConnectivityRefresh,
} from '../ConnectivityRefreshPolicy';
import {
  connectivitySnapshotSignature,
  shouldApplyConnectivitySnapshot,
} from '../ConnectivitySnapshotPolicy';

export function useConnectivityController(
  service: ConnectivityService,
  isForeground: boolean,
) {
  const [
    connectivity,
    setConnectivity,
  ] =
    useState<ConnectivitySnapshot>(
      INITIAL_CONNECTIVITY,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<ConnectivityErrorCode | null>(
      null,
    );

  const mountedRef =
    useRef(true);

  const latestChangedAtRef =
    useRef(0);

  const lastSignatureRef =
    useRef<string | null>(null);

  const snapshotRevisionRef =
    useRef(0);

  const refreshRequestRef =
    useRef(0);

  const previousForegroundRef =
    useRef(isForeground);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applySnapshot =
    useCallback((
      snapshot: ConnectivitySnapshot,
      source: 'initial' | 'subscription' | 'foreground',
    ) => {
      if (
        !mountedRef.current ||
        !shouldApplyConnectivitySnapshot(
          latestChangedAtRef.current,
          snapshot.changedAt,
        )
      ) {
        return;
      }

      latestChangedAtRef.current =
        snapshot.changedAt;
      snapshotRevisionRef.current += 1;

      const signature =
        connectivitySnapshotSignature(
          snapshot,
        );

      if (
        signature !==
        lastSignatureRef.current
      ) {
        lastSignatureRef.current =
          signature;

        diagnosticsService.record(
          'connectivity',
          `${source}:${signature}`,
        );
      }

      setConnectivity(snapshot);
      setLoading(false);
      setError(null);
    }, []);

  const refresh =
    useCallback(async (
      source: 'initial' | 'foreground',
    ) => {
      const requestId =
        refreshRequestRef.current + 1;
      refreshRequestRef.current =
        requestId;

      const snapshotRevisionAtStart =
        snapshotRevisionRef.current;

      try {
        const current =
          await service.getCurrent();

        if (
          !mountedRef.current ||
          !shouldCommitConnectivityRefresh(
            requestId,
            refreshRequestRef.current,
            snapshotRevisionAtStart,
            snapshotRevisionRef.current,
          )
        ) {
          return;
        }

        applySnapshot(
          current,
          source,
        );
      } catch {
        if (
          !mountedRef.current ||
          !shouldCommitConnectivityRefresh(
            requestId,
            refreshRequestRef.current,
            snapshotRevisionAtStart,
            snapshotRevisionRef.current,
          )
        ) {
          return;
        }

        diagnosticsService.record(
          'connectivity',
          'refresh-failed',
          'error',
        );

        setError('refresh');
        setLoading(false);
      }
    }, [
      applySnapshot,
      service,
    ]);

  useEffect(() => {
    const unsubscribe =
      service.subscribe(
        (current) => {
          applySnapshot(
            current,
            'subscription',
          );
        },
      );

    void refresh('initial');

    return () => {
      unsubscribe();
    };
  }, [
    applySnapshot,
    refresh,
    service,
  ]);

  useEffect(() => {
    const wasForeground =
      previousForegroundRef.current;

    previousForegroundRef.current =
      isForeground;

    if (
      !wasForeground &&
      isForeground
    ) {
      void refresh('foreground');
    }
  }, [
    isForeground,
    refresh,
  ]);

  const dismissError =
    useCallback(() => {
      setError(null);
    }, []);

  return {
    connectivity,
    loading,
    error,
    dismissError,
  };
}
