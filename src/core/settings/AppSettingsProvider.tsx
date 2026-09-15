import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  AppSettings,
  DEFAULT_APP_SETTINGS,
} from '../../contracts/AppSettings';
import {
  SettingsRepository,
} from '../../contracts/SettingsRepository';

export type AppSettingsErrorCode =
  | 'load'
  | 'save'
  | 'reset';

type AppSettingsContextValue = {
  settings: AppSettings;
  loading: boolean;
  busy: boolean;
  error: AppSettingsErrorCode | null;
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
  createContext<AppSettingsContextValue | null>(null);

type Props =
  PropsWithChildren<{
    repository: SettingsRepository;
  }>;

export function AppSettingsProvider({
  repository,
  children,
}: Props) {
  const [settings, setSettings] =
    useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] =
    useState<AppSettingsErrorCode | null>(null);

  const loadLockRef = useRef(false);
  const mutationLockRef = useRef(false);

  const load = useCallback(async () => {
    if (loadLockRef.current || mutationLockRef.current) {
      return;
    }

    loadLockRef.current = true;
    setLoading(true);

    try {
      const stored = await repository.getAll();

      setSettings({
        ...DEFAULT_APP_SETTINGS,
        ...stored,
      });
      setError(null);
    } catch {
      setError('load');
    } finally {
      loadLockRef.current = false;
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    void load();
  }, [load]);

  const update = useCallback(
    async <K extends keyof AppSettings>(
      key: K,
      value: AppSettings[K],
    ) => {
      if (mutationLockRef.current || loadLockRef.current) {
        return;
      }

      mutationLockRef.current = true;
      setBusy(true);

      try {
        await repository.set(key, value);
        setSettings((current) => ({
          ...current,
          [key]: value,
        }));
        setError(null);
      } catch {
        setError('save');
      } finally {
        mutationLockRef.current = false;
        setBusy(false);
      }
    },
    [repository],
  );

  const reset = useCallback(async () => {
    if (mutationLockRef.current || loadLockRef.current) {
      return;
    }

    mutationLockRef.current = true;
    setBusy(true);

    try {
      await repository.clear();
      setSettings(DEFAULT_APP_SETTINGS);
      setError(null);
    } catch {
      setError('reset');
    } finally {
      mutationLockRef.current = false;
      setBusy(false);
    }
  }, [repository]);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo<AppSettingsContextValue>(
    () => ({
      settings,
      loading,
      busy,
      error,
      update,
      reset,
      reload: load,
      dismissError,
    }),
    [
      busy,
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
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings(): AppSettingsContextValue {
  const value = useContext(AppSettingsContext);

  if (!value) {
    throw new Error(
      'useAppSettings must be used inside AppSettingsProvider',
    );
  }

  return value;
}
