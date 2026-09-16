import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  AppPermissionId,
  AppPermissionRecord,
  PermissionService,
} from '../../../contracts/PermissionService';
import type {
  PermissionSettingsService,
} from '../../../contracts/PermissionSettingsService';

export type PermissionErrorCode =
  | 'load'
  | 'request'
  | 'settings';

export function usePermissionController(
  service: PermissionService,
  settingsService: PermissionSettingsService,
) {
  const [permissions, setPermissions] =
    useState<AppPermissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] =
    useState<AppPermissionId | null>(null);
  const [openingSettingsId, setOpeningSettingsId] =
    useState<AppPermissionId | null>(null);
  const [errorCode, setErrorCode] =
    useState<PermissionErrorCode | null>(null);

  const mountedRef = useRef(false);
  const serviceRevisionRef = useRef(0);
  const refreshLockRef = useRef(false);
  const requestLockRef = useRef(false);
  const settingsLockRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      serviceRevisionRef.current += 1;
      refreshLockRef.current = false;
      requestLockRef.current = false;
      settingsLockRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (
      refreshLockRef.current ||
      requestLockRef.current ||
      settingsLockRef.current
    ) {
      return;
    }

    const revision = serviceRevisionRef.current;

    refreshLockRef.current = true;

    if (mountedRef.current) {
      setLoading(true);
    }

    try {
      const nextPermissions =
        await service.getAll();

      if (
        !mountedRef.current ||
        revision !== serviceRevisionRef.current
      ) {
        return;
      }

      setPermissions(nextPermissions);
      setErrorCode(null);
    } catch {
      if (
        !mountedRef.current ||
        revision !== serviceRevisionRef.current
      ) {
        return;
      }

      setErrorCode('load');
    } finally {
      if (
        revision === serviceRevisionRef.current
      ) {
        refreshLockRef.current = false;

        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }
  }, [service]);

  useEffect(() => {
    serviceRevisionRef.current += 1;
    refreshLockRef.current = false;
    requestLockRef.current = false;
    settingsLockRef.current = false;
    setRequestingId(null);
    setOpeningSettingsId(null);

    void refresh();

    return () => {
      serviceRevisionRef.current += 1;
      refreshLockRef.current = false;
      requestLockRef.current = false;
      settingsLockRef.current = false;
    };
  }, [
    refresh,
    settingsService,
  ]);

  const request = useCallback(
    async (
      id: AppPermissionId,
    ) => {
      if (
        requestLockRef.current ||
        refreshLockRef.current ||
        settingsLockRef.current
      ) {
        return null;
      }

      const revision = serviceRevisionRef.current;

      requestLockRef.current = true;

      if (mountedRef.current) {
        setRequestingId(id);
      }

      try {
        const result = await service.request(id);

        if (
          !mountedRef.current ||
          revision !== serviceRevisionRef.current
        ) {
          return null;
        }

        if (result.id !== id) {
          setErrorCode('request');
          return null;
        }

        setPermissions((current) =>
          current.map((permission) =>
            permission.id === id
              ? result
              : permission,
          ),
        );
        setErrorCode(null);

        return result;
      } catch {
        if (
          !mountedRef.current ||
          revision !== serviceRevisionRef.current
        ) {
          return null;
        }

        setErrorCode('request');
        return null;
      } finally {
        if (
          revision === serviceRevisionRef.current
        ) {
          requestLockRef.current = false;

          if (mountedRef.current) {
            setRequestingId(null);
          }
        }
      }
    },
    [service],
  );

  const openSettings = useCallback(
    async (
      id: AppPermissionId,
    ) => {
      if (
        settingsLockRef.current ||
        refreshLockRef.current ||
        requestLockRef.current
      ) {
        return false;
      }

      const revision = serviceRevisionRef.current;

      settingsLockRef.current = true;

      if (mountedRef.current) {
        setOpeningSettingsId(id);
      }

      try {
        await settingsService.openAppSettings();

        if (
          !mountedRef.current ||
          revision !== serviceRevisionRef.current
        ) {
          return false;
        }

        setErrorCode(null);
        return true;
      } catch {
        if (
          !mountedRef.current ||
          revision !== serviceRevisionRef.current
        ) {
          return false;
        }

        setErrorCode('settings');
        return false;
      } finally {
        if (
          revision === serviceRevisionRef.current
        ) {
          settingsLockRef.current = false;

          if (mountedRef.current) {
            setOpeningSettingsId(null);
          }
        }
      }
    },
    [settingsService],
  );

  const dismissError = useCallback(() => {
    setErrorCode(null);
  }, []);

  return {
    permissions,
    loading,
    requestingId,
    openingSettingsId,
    errorCode,
    refresh,
    request,
    openSettings,
    dismissError,
  };
}
