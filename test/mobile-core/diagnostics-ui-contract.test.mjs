import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const screen = fs.readFileSync(
  'src/features/diagnostics/DiagnosticsScreen.tsx',
  'utf8',
);
const controller = fs.readFileSync(
  'src/features/diagnostics/hooks/useDiagnosticsController.ts',
  'utf8',
);
const eventList = fs.readFileSync(
  'src/features/diagnostics/components/DiagnosticEventList.tsx',
  'utf8',
);
const maintenance = fs.readFileSync(
  'src/features/diagnostics/components/StorageMaintenanceCard.tsx',
  'utf8',
);
const formatter = fs.readFileSync(
  'src/features/diagnostics/formatters/formatDiagnosticTimestamp.ts',
  'utf8',
);
const translations = fs.readFileSync(
  'src/core/localization/translations.ts',
  'utf8',
);

function countTranslationKey(key) {
  const pattern = new RegExp(
    `^\\s*${key}:\\s`,
    'gm',
  );

  return translations.match(pattern)?.length ?? 0;
}

test(
  'diagnostics screen delegates data and presentation responsibilities',
  () => {
    assert.match(screen, /useDiagnosticsController/);

    for (const component of [
      'DiagnosticsScreenHeader',
      'DiagnosticsSectionHeader',
      'CoreHealthCard',
      'StorageMaintenanceCard',
      'DiagnosticEventList',
      'ClearDiagnosticsButton',
    ]) {
      assert.match(screen, new RegExp(component));
    }

    assert.doesNotMatch(screen, /diagnosticsService/);
    assert.doesNotMatch(screen, /ActivityIndicator/);
    assert.doesNotMatch(screen, /\bPressable\b/);
    assert.doesNotMatch(screen, /toLocaleString\(/);
  },
);

test(
  'diagnostics controller owns repository and maintenance operations',
  () => {
    assert.match(controller, /repository\.list/);
    assert.match(controller, /repository\.clear/);
    assert.match(controller, /diagnosticsService\.snapshot/);
    assert.match(controller, /diagnosticsService\.clear/);
    assert.match(controller, /runAttachmentMaintenance/);
  },
);

test(
  'diagnostics event presentation is locale aware and deterministic',
  () => {
    assert.match(eventList, /formatDiagnosticTimestamp/);
    assert.match(eventList, /useLocale/);
    assert.match(formatter, /Intl\.DateTimeFormat/);
    assert.match(formatter, /Number\.isSafeInteger/);
    assert.doesNotMatch(eventList, /toLocaleString\(/);
  },
);

test(
  'diagnostics maintenance action keeps accessible target state',
  () => {
    assert.match(maintenance, /minHeight:\s*44/);
    assert.match(maintenance, /accessibilityState=\{\{ disabled: busy, busy \}\}/);
    assert.match(maintenance, /Intl\.NumberFormat/);
  },
);

test(
  'diagnostics localization keys exist in all locale tables',
  () => {
    for (const key of [
      'coreHealthSection',
      'storageMaintenanceSection',
      'localDiagnosticsSection',
      'healthHealthy',
      'healthDegraded',
      'healthReady',
      'healthStarting',
      'noCoreIssues',
      'storageMaintenanceDescription',
      'runSafeStorageCleanup',
      'runSafeCleanup',
      'storageAlreadyClean',
      'storageCleanupRemoved',
      'orphanAttachments',
      'noLocalDiagnosticEvents',
      'diagnosticLevelInfo',
      'diagnosticLevelWarning',
      'diagnosticLevelError',
      'refreshDiagnostics',
      'refresh',
      'clearLocalDiagnostics',
      'clearDiagnostics',
      'clearDiagnosticsTitle',
      'clearDiagnosticsMessage',
      'clear',
      'diagnosticsLoadFailed',
      'diagnosticsClearFailed',
      'storageMaintenanceFailed',
    ]) {
      assert.equal(
        countTranslationKey(key),
        3,
        `${key} must exist in ar, de and en`,
      );
    }
  },
);
