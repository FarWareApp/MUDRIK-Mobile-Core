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
import { getDiagnosticsErrorTranslationKey } from './getDiagnosticsErrorTranslationKey';
import { useDiagnosticsController } from './hooks/useDiagnosticsController';

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
  const errorKey = getDiagnosticsErrorTranslationKey(
    controller.errorCode,
  );
  const errorMessage = errorKey
    ? t(errorKey)
    : null;
  const controlsDisabled =
    controller.busy || controller.loading;

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

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <DiagnosticsSectionHeader
          title={t('coreHealthSection')}
        />

        <CoreHealthCard health={health} />

        <DiagnosticsSectionHeader
          title={t('storageMaintenanceSection')}
        />

        <StorageMaintenanceCard
          busy={controlsDisabled}
          removedCount={controller.maintenanceRemovedCount}
          onRun={() => {
            void controller.runMaintenance();
          }}
        />

        <DiagnosticsSectionHeader
          title={t('localDiagnosticsSection')}
          actionLabel={t('refreshDiagnostics')}
          actionText={t('refresh')}
          disabled={controlsDisabled}
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
            controlsDisabled ||
            controller.events.length === 0
          }
          onPress={confirmClear}
        />
      </ScrollView>
    </SafeAreaView>
  );
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
