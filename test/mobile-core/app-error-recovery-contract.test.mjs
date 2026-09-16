import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const boundary = fs.readFileSync(
  'src/core/errors/AppErrorBoundary.tsx',
  'utf8',
);
const fallback = fs.readFileSync(
  'src/core/errors/AppErrorFallback.tsx',
  'utf8',
);
const emergencyTranslations = fs.readFileSync(
  'src/core/errors/emergencyErrorTranslations.ts',
  'utf8',
);
const localeProvider = fs.readFileSync(
  'src/core/localization/LocaleProvider.tsx',
  'utf8',
);
const resolvedLocale = fs.readFileSync(
  'src/core/localization/useResolvedAppLocale.ts',
  'utf8',
);
const systemLocale = fs.readFileSync(
  'src/core/localization/resolveSystemLocale.ts',
  'utf8',
);

test(
  'error boundary keeps recovery logic separate from emergency presentation',
  () => {
    assert.match(boundary, /AppErrorFallback/);
    assert.match(boundary, /diagnosticsService\.record/);
    assert.match(boundary, /recoveryKey/);
    assert.doesNotMatch(boundary, /StyleSheet/);
    assert.doesNotMatch(boundary, /MUDRIK encountered/);
    assert.doesNotMatch(boundary, /Restart application interface/);
  },
);

test(
  'emergency fallback remains independent from app providers',
  () => {
    assert.match(fallback, /useColorScheme/);
    assert.match(fallback, /resolveSystemLocale/);
    assert.match(fallback, /lightColors/);
    assert.match(fallback, /darkColors/);
    assert.doesNotMatch(fallback, /useTheme/);
    assert.doesNotMatch(fallback, /useLocale/);
    assert.doesNotMatch(fallback, /useAppSettings/);
  },
);

test(
  'emergency fallback preserves accessibility and stable press feedback',
  () => {
    assert.match(fallback, /accessibilityRole="alert"/);
    assert.match(fallback, /accessibilityLiveRegion="assertive"/);
    assert.match(fallback, /accessibilityRole="button"/);
    assert.match(fallback, /minHeight:\s*48/);
    assert.match(fallback, /motion\.press\.scale/);
    assert.match(fallback, /backgroundColor:\s*colors\.accent/);
    assert.match(fallback, /color:\s*colors\.accentText/);
  },
);

test(
  'emergency copy is complete for Arabic German and English',
  () => {
    const catalogStart = emergencyTranslations.indexOf(
      'export const emergencyErrorTranslations = {',
    );
    const catalogEnd = emergencyTranslations.indexOf(
      '} as const satisfies',
    );

    assert.notEqual(catalogStart, -1);
    assert.notEqual(catalogEnd, -1);
    assert.ok(catalogEnd > catalogStart);

    const catalogBody = emergencyTranslations.slice(
      catalogStart,
      catalogEnd,
    );

    for (const key of [
      'title',
      'body',
      'referenceLabel',
      'retry',
      'retryAccessibility',
    ]) {
      const pattern = new RegExp(
        `^\\s*${key}:\\s`,
        'gm',
      );

      assert.equal(
        catalogBody.match(pattern)?.length ?? 0,
        3,
      );
    }
  },
);

test(
  'system locale resolution is shared through a focused hook and has a safe English fallback',
  () => {
    assert.match(localeProvider, /useResolvedAppLocale/);
    assert.doesNotMatch(localeProvider, /resolveSystemLocale/);
    assert.doesNotMatch(localeProvider, /getLocales/);
    assert.match(resolvedLocale, /resolveSystemLocale\(\)/);
    assert.match(systemLocale, /getLocales/);
    assert.match(systemLocale, /catch/);
    assert.match(systemLocale, /return 'en';/);
  },
);
