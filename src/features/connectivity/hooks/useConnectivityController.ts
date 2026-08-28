import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ConnectivitySnapshot,
  INITIAL_CONNECTIVITY,
} from '../../../contracts/Connectivity';

import {
  ConnectivityService,
} from '../../../contracts/ConnectivityService';

export function useConnectivityController(
  service: ConnectivityService,
) {
  const [
    connectivity,
    setConnectivity,
  ] =
    useState<ConnectivitySnapshot>(
      INITIAL_CONNECTIVITY,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
    let mounted = true;

    void service
      .getCurrent()
      .then((current) => {
        if (!mounted) {
          return;
        }

        setConnectivity(
          current,
        );

        setError(null);
      })
      .catch(() => {
        if (mounted) {
          setError(
            'Unable to read network state.',
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    const unsubscribe =
      service.subscribe(
        (current) => {
          if (!mounted) {
            return;
          }

          setConnectivity(
            current,
          );

          setLoading(false);
          setError(null);
        },
      );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [service]);

  const dismissError =
    useCallback(() => {
      setError(null);
    }, []);

  return {
    connectivity,
    loading,
    error,
    dismissError,
  };
}
