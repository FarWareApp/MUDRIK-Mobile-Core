import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  AppState,
} from 'react-native';

import {
  AppPermissionId,
  AppPermissionRecord,
  PermissionService,
} from '../../../contracts/PermissionService';

export type PermissionErrorCode =
  | 'load'
  | 'request';

export function usePermissionController(
  service: PermissionService,
) {
  const [permissions, setPermissions] =
    useState<AppPermissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] =
    useState<AppPermissionId | null>(null);
  const [errorCode, setErrorCode] =
    useState<PermissionErrorCode | null>(null);

  const mountedRef = useRef(false);
  const serviceRevisionRef = useRef(0);
  const refreshLockRef = useRef(false);
  const requestLockRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      serviceRevisionRef.current += 1;
      refreshLockRef.current = false;
      requestLockRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (refreshLockRef.current || requestLockRef.current) {
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
    setRequestingId(null);

    void refresh();

    return () => {
      serviceRevisionRef.current += 1;
      refreshLockRef.current = false;
      requestLockRef.current = false;
    };
  }, [refresh]);

  useEffect(() => {
    const subscription =
      AppState.addEventListener(
        'change',
        (state) => {
          if (state === 'active') {
            void refresh();
          }
        },
      );

    return () => {
      subscription.remove();
    };
  }, [refresh]);

  const request = useCallback(
    async (
      id: AppPermissionId,
    ) => {
      if (requestLockRef.current || refreshLockRef.current) {
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

  const dismissError = useCallback(() => {
    setErrorCode(null);
  }, []);

  return {
    permissions,
    loading,
    requestingId,
    errorCode,
    refresh,
    request,
    dismissError,
  };
}
