import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  AppPermissionId,
  AppPermissionRecord,
  PermissionService,
} from '../../../contracts/PermissionService';

export function usePermissionController(
  service: PermissionService,
) {
  const [
    permissions,
    setPermissions,
  ] = useState<
    AppPermissionRecord[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const refresh =
    useCallback(async () => {
      setLoading(true);

      try {
        setPermissions(
          await service.getAll(),
        );

        setError(null);
      } catch {
        setError(
          'Unable to read permissions.',
        );
      } finally {
        setLoading(false);
      }
    }, [service]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const request =
    useCallback(
      async (
        id: AppPermissionId,
      ) => {
        try {
          const result =
            await service.request(id);

          setPermissions(
            (current) =>
              current.map(
                (permission) =>
                  permission.id === id
                    ? result
                    : permission,
              ),
          );

          return result;
        } catch {
          setError(
            'Unable to request permission.',
          );

          return null;
        }
      },
      [service],
    );

  return {
    permissions,
    loading,
    error,

    refresh,
    request,

    dismissError: () =>
      setError(null),
  };
}
