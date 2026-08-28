import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  AppSettings,
  DEFAULT_APP_SETTINGS,
} from '../../../contracts/AppSettings';

import {
  SettingsRepository,
} from '../../../contracts/SettingsRepository';

export function useSettingsController(
  repository: SettingsRepository,
) {
  const [settings, setSettings] =
    useState<AppSettings>(
      DEFAULT_APP_SETTINGS,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const load =
    useCallback(async () => {
      setLoading(true);

      try {
        const stored =
          await repository.getAll();

        setSettings({
          ...DEFAULT_APP_SETTINGS,
          ...stored,
        });

        setError(null);
      } catch {
        setError(
          'Unable to load settings.',
        );
      } finally {
        setLoading(false);
      }
    }, [repository]);

  useEffect(() => {
    void load();
  }, [load]);

  const update =
    useCallback(
      async <
        K extends keyof AppSettings,
      >(
        key: K,
        value: AppSettings[K],
      ) => {
        const previous =
          settings[key];

        setSettings(
          (current) => ({
            ...current,
            [key]: value,
          }),
        );

        try {
          await repository.set(
            key,
            value,
          );
        } catch {
          setSettings(
            (current) => ({
              ...current,
              [key]: previous,
            }),
          );

          setError(
            'Unable to save setting.',
          );
        }
      },
      [
        repository,
        settings,
      ],
    );

  const reset =
    useCallback(async () => {
      try {
        await repository.clear();

        setSettings(
          DEFAULT_APP_SETTINGS,
        );

        setError(null);
      } catch {
        setError(
          'Unable to reset settings.',
        );
      }
    }, [repository]);

  return {
    settings,
    loading,
    error,

    update,
    reset,
    reload: load,

    dismissError: () =>
      setError(null),
  };
}
