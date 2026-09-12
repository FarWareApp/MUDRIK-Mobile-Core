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
    useState<string | null>(
      null,
    );

  const mountedRef =
    useRef(true);

  const latestChangedAtRef =
    useRef(0);

  const lastSignatureRef =
    useRef<string | null>(null);

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
      try {
        const current =
          await service.getCurrent();

        applySnapshot(
          current,
          source,
        );
      } catch (caught) {
        if (!mountedRef.current) {
          return;
        }

        diagnosticsService.record(
          'connectivity',
          caught instanceof Error
            ? `refresh-failed:${caught.message}`
            : 'refresh-failed:unknown',
          'error',
        );

        setError(
          'Unable to read network state.',
        );
        setLoading(false);
      }
    }, [
      applySnapshot,
      service,
    ]);

  useEffect(() => {
    void refresh('initial');

    const unsubscribe =
      service.subscribe(
        (current) => {
          applySnapshot(
            current,
            'subscription',
          );
        },
      );

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
