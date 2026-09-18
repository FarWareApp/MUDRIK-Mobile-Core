import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  createDefaultCompanionProfile,
} from '../../../contracts/Companion';
import type {
  CompanionProfile,
} from '../../../contracts/Companion';
import type {
  CompanionRepository,
} from '../../../contracts/CompanionRepository';
import {
  diagnosticsService,
} from '../../../core/diagnostics/DiagnosticsService';
import type {
  CompanionProfileErrorCode,
} from '../CompanionProfileErrorCode';

function recordCompanionProfileError(
  event: string,
  caught: unknown,
): void {
  diagnosticsService.record(
    'companion-profile',
    caught instanceof Error
      ? `${event}:${caught.message}`
      : `${event}:unknown`,
    'error',
  );
}

export function useCompanionProfileController(
  repository: CompanionRepository,
) {
  const [profile, setProfile] =
    useState<CompanionProfile>(
      createDefaultCompanionProfile,
    );

  const [loading, setLoading] =
    useState(true);

  const [loadFailed, setLoadFailed] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<CompanionProfileErrorCode | null>(null);

  const mountedRef =
    useRef(false);

  const sourceRevisionRef =
    useRef(0);

  const loadRequestIdRef =
    useRef(0);

  const mutationInFlightRef =
    useRef(false);

  const mutationIdRef =
    useRef(0);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      sourceRevisionRef.current += 1;
      loadRequestIdRef.current += 1;
      mutationIdRef.current += 1;
      mutationInFlightRef.current = false;
    };
  }, []);

  useEffect(() => {
    sourceRevisionRef.current += 1;
    loadRequestIdRef.current += 1;
    mutationIdRef.current += 1;
    mutationInFlightRef.current = false;

    if (mountedRef.current) {
      setSaving(false);
    }
  }, [repository]);

  const beginMutation =
    useCallback((): number | null => {
      if (mutationInFlightRef.current) {
        return null;
      }

      mutationInFlightRef.current = true;
      const mutationId =
        ++mutationIdRef.current;

      loadRequestIdRef.current += 1;
      setSaving(true);
      setError(null);

      return mutationId;
    }, []);

  const endMutation =
    useCallback((mutationId: number) => {
      if (
        mutationIdRef.current !== mutationId
        || !mountedRef.current
      ) {
        return;
      }

      mutationInFlightRef.current = false;
      setSaving(false);
    }, []);

  const load =
    useCallback(async () => {
      const sourceRevision =
        sourceRevisionRef.current;
      const requestId =
        ++loadRequestIdRef.current;

      if (mountedRef.current) {
        setLoading(true);
        setLoadFailed(false);
        setError(null);
      }

      const isCurrent = () => (
        mountedRef.current
        && sourceRevisionRef.current === sourceRevision
        && loadRequestIdRef.current === requestId
      );

      try {
        const stored =
          await repository.getProfile();

        if (!isCurrent()) {
          return;
        }

        setProfile(
          stored
            ?? createDefaultCompanionProfile(),
        );
      } catch (caught) {
        if (!isCurrent()) {
          return;
        }

        recordCompanionProfileError(
          'load-failed',
          caught,
        );
        setLoadFailed(true);
        setError('load-failed');
      } finally {
        if (isCurrent()) {
          setLoading(false);
        }
      }
    }, [repository]);

  useEffect(() => {
    void load();
  }, [load]);

  const save =
    useCallback(
      async (
        next: CompanionProfile,
      ): Promise<boolean> => {
        const displayName =
          next.displayName.trim();

        if (!displayName) {
          if (mountedRef.current) {
            setError('name-required');
          }
          return false;
        }

        const mutationId =
          beginMutation();

        if (mutationId === null) {
          return false;
        }

        const sourceRevision =
          sourceRevisionRef.current;

        const isCurrent = () => (
          mountedRef.current
          && sourceRevisionRef.current === sourceRevision
          && mutationIdRef.current === mutationId
        );

        const updated: CompanionProfile = {
          ...next,
          companionId: profile.companionId,
          displayName,
          createdAt: profile.createdAt,
          revision: profile.revision + 1,
          updatedAt: Date.now(),
        };

        try {
          await repository.saveProfile(updated);

          if (!isCurrent()) {
            return false;
          }

          setProfile(updated);
          setError(null);
          return true;
        } catch (caught) {
          if (!isCurrent()) {
            return false;
          }

          recordCompanionProfileError(
            'save-failed',
            caught,
          );
          setError('save-failed');
          return false;
        } finally {
          endMutation(mutationId);
        }
      },
      [
        beginMutation,
        endMutation,
        profile.companionId,
        profile.createdAt,
        profile.revision,
        repository,
      ],
    );

  const reset =
    useCallback(async (): Promise<boolean> => {
      const mutationId =
        beginMutation();

      if (mutationId === null) {
        return false;
      }

      const sourceRevision =
        sourceRevisionRef.current;

      const isCurrent = () => (
        mountedRef.current
        && sourceRevisionRef.current === sourceRevision
        && mutationIdRef.current === mutationId
      );

      try {
        await repository.clearProfile();

        if (!isCurrent()) {
          return false;
        }

        setProfile(
          createDefaultCompanionProfile(),
        );
        setError(null);
        return true;
      } catch (caught) {
        if (!isCurrent()) {
          return false;
        }

        recordCompanionProfileError(
          'reset-failed',
          caught,
        );
        setError('reset-failed');
        return false;
      } finally {
        endMutation(mutationId);
      }
    }, [
      beginMutation,
      endMutation,
      repository,
    ]);

  const dismissError =
    useCallback(() => {
      if (
        mountedRef.current
        && !loadFailed
      ) {
        setError(null);
      }
    }, [loadFailed]);

  return {
    profile,
    loading,
    failed: loadFailed,
    saving,
    error,
    save,
    reset,
    reload: load,
    dismissError,
  };
}
