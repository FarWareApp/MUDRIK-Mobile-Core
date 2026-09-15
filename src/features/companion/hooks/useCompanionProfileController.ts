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

  const mutationInFlightRef =
    useRef(false);

  const beginMutation =
    useCallback((): boolean => {
      if (mutationInFlightRef.current) {
        return false;
      }

      mutationInFlightRef.current = true;
      setSaving(true);
      setError(null);
      return true;
    }, []);

  const endMutation =
    useCallback(() => {
      mutationInFlightRef.current = false;
      setSaving(false);
    }, []);

  const load =
    useCallback(async () => {
      setLoading(true);
      setLoadFailed(false);
      setError(null);

      try {
        const stored =
          await repository.getProfile();

        setProfile(
          stored
            ?? createDefaultCompanionProfile(),
        );
      } catch (caught) {
        recordCompanionProfileError(
          'load-failed',
          caught,
        );
        setLoadFailed(true);
        setError('load-failed');
      } finally {
        setLoading(false);
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
          setError('name-required');
          return false;
        }

        if (!beginMutation()) {
          return false;
        }

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
          setProfile(updated);
          setError(null);
          return true;
        } catch (caught) {
          recordCompanionProfileError(
            'save-failed',
            caught,
          );
          setError('save-failed');
          return false;
        } finally {
          endMutation();
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
      if (!beginMutation()) {
        return false;
      }

      try {
        await repository.clearProfile();
        setProfile(
          createDefaultCompanionProfile(),
        );
        setError(null);
        return true;
      } catch (caught) {
        recordCompanionProfileError(
          'reset-failed',
          caught,
        );
        setError('reset-failed');
        return false;
      } finally {
        endMutation();
      }
    }, [
      beginMutation,
      endMutation,
      repository,
    ]);

  const dismissError =
    useCallback(() => {
      if (!loadFailed) {
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
