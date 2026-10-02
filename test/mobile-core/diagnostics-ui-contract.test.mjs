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
const flagshipIconButton = fs.readFileSync(
  'src/design-system/components/FlagshipIconButton.tsx',
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
const modeTabs = fs.readFileSync(
  'src/features/diagnostics/components/DiagnosticsModeTabs.tsx',
  'utf8',
);
const advancedNotice = fs.readFileSync(
  'src/features/diagnostics/components/DiagnosticsAdvancedNotice.tsx',
  'utf8',
);
const translations = fs.readFileSync(
  'src/core/localization/translations.ts',
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
    assert.match(screen, /useState<DiagnosticsMode>/);
    assert.match(screen, /'overview'/);
    assert.match(screen, /mode === 'advanced'/);
    assert.match(screen, /DiagnosticsModeTabs/);
    assert.match(screen, /DiagnosticsAdvancedNotice/);
    assert.doesNotMatch(screen, /function errorFor/);
  },
);

test(
  'diagnostics header uses a stable RTL-aware flagship primitive with reduced-motion feedback',
  () => {
    assert.match(header, /FlagshipIconButton/);
    assert.match(header, /DiagnosticsBackIcon/);
    assert.match(header, /isRTL/);
    assert.match(header, /typeScale\.heading/);
    assert.doesNotMatch(header, /‹/u);

    assert.match(flagshipIconButton, /useAccessibility/);
    assert.match(flagshipIconButton, /motion\.press/);
    assert.match(flagshipIconButton, /size = 44/);
    assert.match(flagshipIconButton, /accessibilityRole="button"/);

    assert.doesNotMatch(backIcon, /Text/);
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


test(
  'diagnostics defaults to a user-facing overview and gates raw logs behind an advanced tab',
  () => {
    assert.match(modeTabs, /accessibilityRole="tablist"/);
    assert.match(modeTabs, /accessibilityRole="tab"/);
    assert.match(modeTabs, /diagnosticsOverviewTab/);
    assert.match(modeTabs, /diagnosticsAdvancedTab/);
    assert.match(modeTabs, /minHeight:\s*44/);

    assert.match(advancedNotice, /InsetSurfaceCard/);
    assert.match(advancedNotice, /diagnosticsAdvancedDescription/);

    for (const key of [
      'diagnosticsOverviewTab',
      'diagnosticsAdvancedTab',
      'diagnosticsAdvancedDescription',
    ]) {
      const pattern = new RegExp(
        '^\\s*' + key + ':\\s',
        'gm',
      );
      assert.equal(
        translations.match(pattern)?.length ?? 0,
        3,
        key + ' must exist in ar, de and en',
      );
    }
  },
);
