import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const screen = fs.readFileSync(
  'src/features/diagnostics/DiagnosticsScreen.tsx',
  'utf8',
);
const header = fs.readFileSync(
  'src/features/diagnostics/components/DiagnosticsScreenHeader.tsx',
  'utf8',
);
const backIcon = fs.readFileSync(
  'src/features/diagnostics/components/DiagnosticsBackIcon.tsx',
  'utf8',
);
const sectionHeader = fs.readFileSync(
  'src/features/diagnostics/components/DiagnosticsSectionHeader.tsx',
  'utf8',
);
const clearButton = fs.readFileSync(
  'src/features/diagnostics/components/ClearDiagnosticsButton.tsx',
  'utf8',
);
const maintenance = fs.readFileSync(
  'src/features/diagnostics/components/StorageMaintenanceCard.tsx',
  'utf8',
);
const health = fs.readFileSync(
  'src/features/diagnostics/components/CoreHealthCard.tsx',
  'utf8',
);
const eventList = fs.readFileSync(
  'src/features/diagnostics/components/DiagnosticEventList.tsx',
  'utf8',
);
const eventCard = fs.readFileSync(
  'src/features/diagnostics/components/DiagnosticEventCard.tsx',
  'utf8',
);
const controller = fs.readFileSync(
  'src/features/diagnostics/hooks/useDiagnosticsController.ts',
  'utf8',
);
const errorMapper = fs.readFileSync(
  'src/features/diagnostics/getDiagnosticsErrorTranslationKey.ts',
  'utf8',
);

test(
  'diagnostics screen keeps orchestration separate and locks destructive controls while loading',
  () => {
    assert.match(screen, /getDiagnosticsErrorTranslationKey/);
    assert.match(screen, /const controlsDisabled =/);
    assert.match(screen, /controller\.busy \|\| controller\.loading/);
    assert.match(screen, /showsVerticalScrollIndicator=\{false\}/);
    assert.match(screen, /disabled=\{controlsDisabled\}/);
    assert.doesNotMatch(screen, /function errorFor/);
  },
);

test(
  'diagnostics header uses a stable RTL-aware primitive and reduced-motion press feedback',
  () => {
    assert.match(header, /DiagnosticsBackIcon/);
    assert.match(header, /useAccessibility/);
    assert.match(header, /isRTL/);
    assert.match(header, /motion\.press\.subtleScale/);
    assert.match(header, /typeScale\.heading/);
    assert.match(header, /width:\s*44/);
    assert.match(header, /height:\s*44/);
    assert.doesNotMatch(header, /‹/u);

    assert.doesNotMatch(backIcon, /\bText\b/);
    assert.match(backIcon, /scaleX:\s*-1/);
  },
);

test(
  'diagnostics actions use design motion, semantic touch targets and localized text direction',
  () => {
    assert.match(sectionHeader, /motion\.press\.subtleScale/);
    assert.match(sectionHeader, /minHeight:\s*44/);
    assert.match(sectionHeader, /writingDirection:\s*'auto'/);

    assert.match(clearButton, /motion\.press\.subtleScale/);
    assert.match(clearButton, /minHeight:\s*44/);
    assert.match(clearButton, /colors\.error/);
    assert.match(clearButton, /typeScale\.secondary/);

    assert.match(maintenance, /ActivityIndicator/);
    assert.match(maintenance, /accessibilityState=\{\{ disabled: busy, busy \}\}/);
    assert.match(maintenance, /motion\.press\.subtleScale/);
    assert.match(maintenance, /minHeight:\s*48/);
    assert.match(maintenance, /accessibilityLiveRegion="polite"/);
  },
);

test(
  'diagnostics cards support long content and isolate event rendering',
  () => {
    assert.match(health, /flexWrap:\s*'wrap'/);
    assert.match(health, /borderStartWidth:\s*2/);
    assert.match(health, /paddingStart:\s*spacing\.md/);
    assert.match(health, /typeScale\.heading/);
    assert.match(health, /writingDirection:\s*'auto'/);

    assert.match(eventList, /DiagnosticEventCard/);
    assert.match(eventList, /useMemo/);
    assert.match(eventList, /accessibilityRole="progressbar"/);
    assert.doesNotMatch(eventList, /formatDiagnosticTimestamp/);

    assert.match(eventCard, /memo\(/);
    assert.match(eventCard, /formatDiagnosticTimestamp/);
    assert.match(eventCard, /typeScale\.caption/);
    assert.match(eventCard, /writingDirection:\s*'auto'/);
  },
);

test(
  'diagnostics controller prevents concurrent operations and preserves logs when clearing persistence fails',
  () => {
    assert.match(controller, /operationRef/);
    assert.match(controller, /operationRef\.current !== null/);
    assert.match(controller, /mergeDiagnosticEvents/);

    const clearPersist = controller.indexOf('await repository.clear()');
    const clearRuntime = controller.indexOf('diagnosticsService.clear()');

    assert.ok(clearPersist >= 0);
    assert.ok(clearRuntime > clearPersist);
  },
);

test(
  'diagnostics error translation ownership is separated from the screen',
  () => {
    assert.match(errorMapper, /diagnosticsLoadFailed/);
    assert.match(errorMapper, /diagnosticsClearFailed/);
    assert.match(errorMapper, /storageMaintenanceFailed/);
  },
);
