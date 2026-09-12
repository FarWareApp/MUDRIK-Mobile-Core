import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AppSettings,
  DEFAULT_APP_SETTINGS,
} from '../../contracts/AppSettings';

import {
  SettingsRepository,
} from '../../contracts/SettingsRepository';

type AppSettingsContextValue = {
  settings: AppSettings;

  loading: boolean;
  error: string | null;

  update:
    <K extends keyof AppSettings>(
      key: K,
      value: AppSettings[K],
    ) => Promise<void>;

  reset: () => Promise<void>;
  reload: () => Promise<void>;

  dismissError: () => void;
};

const AppSettingsContext =
  createContext<
    AppSettingsContextValue | null
  >(null);

type Props =
  PropsWithChildren<{
    repository:
      SettingsRepository;
  }>;

export function AppSettingsProvider({
  repository,
  children,
}: Props) {
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
      await Promise.resolve();

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
          'Unable to load application settings.',
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

          setError(null);
        } catch {
          setSettings(
            (current) => ({
              ...current,
              [key]: previous,
            }),
          );

          setError(
            'Unable to save application setting.',
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
          'Unable to reset application settings.',
        );
      }
    }, [repository]);

  const dismissError =
    useCallback(() => {
      setError(null);
    }, []);

  const value =
    useMemo<
      AppSettingsContextValue
    >(
      () => ({
        settings,
        loading,
        error,
        update,
        reset,
        reload: load,
        dismissError,
      }),
      [
        dismissError,
        error,
        load,
        loading,
        reset,
        settings,
        update,
      ],
    );

  return (
    <AppSettingsContext.Provider
      value={value}
    >
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings():
  AppSettingsContextValue {
  const value =
    useContext(
      AppSettingsContext,
    );

  if (!value) {
    throw new Error(
      'useAppSettings must be used inside AppSettingsProvider',
    );
  }

  return value;
}
