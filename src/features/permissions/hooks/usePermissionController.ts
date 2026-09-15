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

  const refreshLockRef = useRef(false);
  const requestLockRef = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshLockRef.current || requestLockRef.current) {
      return;
    }

    refreshLockRef.current = true;
    setLoading(true);

    try {
      setPermissions(await service.getAll());
      setErrorCode(null);
    } catch {
      setErrorCode('load');
    } finally {
      refreshLockRef.current = false;
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const request = useCallback(
    async (
      id: AppPermissionId,
    ) => {
      if (requestLockRef.current || refreshLockRef.current) {
        return null;
      }

      requestLockRef.current = true;
      setRequestingId(id);

      try {
        const result = await service.request(id);

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
        setErrorCode('request');
        return null;
      } finally {
        requestLockRef.current = false;
        setRequestingId(null);
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
