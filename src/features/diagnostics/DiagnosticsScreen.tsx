import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { DiagnosticRepository } from '../../contracts/DiagnosticRepository';
import { useCoreHealth } from '../../core/health/CoreHealthProvider';
import { useLocale } from '../../core/localization/LocaleProvider';
import { useTheme } from '../../design-system/theme/ThemeProvider';
import { spacing } from '../../design-system/tokens/spacing';
import { InlineErrorBanner } from '../../shared/components/InlineErrorBanner';

import { ClearDiagnosticsButton } from './components/ClearDiagnosticsButton';
import { CoreHealthCard } from './components/CoreHealthCard';
import { DiagnosticEventList } from './components/DiagnosticEventList';
import { DiagnosticsScreenHeader } from './components/DiagnosticsScreenHeader';
import { DiagnosticsSectionHeader } from './components/DiagnosticsSectionHeader';
import { StorageMaintenanceCard } from './components/StorageMaintenanceCard';
import {
  DiagnosticsErrorCode,
  useDiagnosticsController,
} from './hooks/useDiagnosticsController';

type MaintenanceResult = {
  orphanAttachmentsRemoved: number;
};

type Props = {
  repository: DiagnosticRepository;
  runAttachmentMaintenance: () => Promise<MaintenanceResult>;
};

export function DiagnosticsScreen({
  repository,
  runAttachmentMaintenance,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const health = useCoreHealth();
  const controller = useDiagnosticsController({
    repository,
    runAttachmentMaintenance,
  });

  const errorMessage = errorFor(
    controller.errorCode,
    t,
  );

  const confirmClear = () => {
    Alert.alert(
      t('clearDiagnosticsTitle'),
      t('clearDiagnosticsMessage'),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('clear'),
          style: 'destructive',
          onPress: () => {
            void controller.clearDiagnostics();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colors.background },
      ]}
    >
      <DiagnosticsScreenHeader />

      {errorMessage ? (
        <InlineErrorBanner
          message={errorMessage}
          onRetry={
            controller.errorCode === 'load'
              ? () => {
                  void controller.load();
                }
              : undefined
          }
          onDismiss={controller.dismissError}
        />
      ) : null}

      <ScrollView contentContainerStyle={styles.content}>
        <DiagnosticsSectionHeader
          title={t('coreHealthSection')}
        />

        <CoreHealthCard health={health} />

        <DiagnosticsSectionHeader
          title={t('storageMaintenanceSection')}
        />

        <StorageMaintenanceCard
          busy={controller.busy}
          removedCount={controller.maintenanceRemovedCount}
          onRun={() => {
            void controller.runMaintenance();
          }}
        />

        <DiagnosticsSectionHeader
          title={t('localDiagnosticsSection')}
          actionLabel={t('refreshDiagnostics')}
          actionText={t('refresh')}
          disabled={controller.busy || controller.loading}
          onAction={() => {
            void controller.load();
          }}
        />

        <DiagnosticEventList
          loading={controller.loading}
          events={controller.events}
        />

        <ClearDiagnosticsButton
          disabled={
            controller.busy ||
            controller.events.length === 0
          }
          onPress={confirmClear}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

type Translate = (
  key:
    | 'diagnosticsLoadFailed'
    | 'diagnosticsClearFailed'
    | 'storageMaintenanceFailed',
) => string;

function errorFor(
  errorCode: DiagnosticsErrorCode | null,
  t: Translate,
): string | null {
  if (errorCode === 'load') {
    return t('diagnosticsLoadFailed');
  }

  if (errorCode === 'clear') {
    return t('diagnosticsClearFailed');
  }

  if (errorCode === 'maintenance') {
    return t('storageMaintenanceFailed');
  }

  return null;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.huge,
  },
});
