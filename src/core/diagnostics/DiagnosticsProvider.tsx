import {
  PropsWithChildren,
  useEffect,
} from 'react';

import {
  DiagnosticRepository,
} from '../../contracts/DiagnosticRepository';

import {
  useAppSettings,
} from '../settings/AppSettingsProvider';

import {
  diagnosticsService,
} from './DiagnosticsService';

type Props =
  PropsWithChildren<{
    repository:
      DiagnosticRepository;
  }>;

export function DiagnosticsProvider({
  repository,
  children,
}: Props) {
  const { settings } =
    useAppSettings();

  useEffect(() => {
    diagnosticsService
      .setEnabled(
        settings
          .diagnosticsEnabled,
      );
  }, [
    settings
      .diagnosticsEnabled,
  ]);

  useEffect(() => {
    diagnosticsService
      .configure(
        repository,
      );
  }, [repository]);

  return children;
}
