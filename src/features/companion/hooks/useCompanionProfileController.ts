import {
  useCallback,
  useEffect,
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

export function useCompanionProfileController(
  repository: CompanionRepository,
) {
  const [profile, setProfile] =
    useState<CompanionProfile>(
      createDefaultCompanionProfile(),
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const load =
    useCallback(async () => {
      await Promise.resolve();

      setLoading(true);

      try {
        const stored =
          await repository
            .getProfile();

        if (stored) {
          setProfile(stored);
        }

        setError(null);
      } catch {
        setError(
          'Unable to load companion profile.',
        );
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
        next:
          CompanionProfile,
      ) => {
        setSaving(true);

        try {
          const updated:
            CompanionProfile = {
            ...next,
            companionId:
              profile.companionId,
            createdAt:
              profile.createdAt,
            revision:
              profile.revision + 1,
            updatedAt:
              Date.now(),
          };

          await repository
            .saveProfile(
              updated,
            );

          setProfile(updated);
          setError(null);
        } catch {
          setError(
            'Unable to save companion profile.',
          );
        } finally {
          setSaving(false);
        }
      },
      [
        profile.companionId,
        profile.createdAt,
        profile.revision,
        repository,
      ],
    );

  const reset =
    useCallback(async () => {
      setSaving(true);

      try {
        await repository
          .clearProfile();

        setProfile(
          createDefaultCompanionProfile(),
        );

        setError(null);
      } catch {
        setError(
          'Unable to reset companion profile.',
        );
      } finally {
        setSaving(false);
      }
    }, [repository]);

  return {
    profile,
    loading,
    saving,
    error,

    save,
    reset,
    reload: load,

    dismissError: () =>
      setError(null),
  };
}
