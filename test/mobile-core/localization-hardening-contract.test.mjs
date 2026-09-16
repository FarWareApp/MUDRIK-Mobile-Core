import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const localeType = fs.readFileSync(
  'src/core/localization/AppLocale.ts',
  'utf8',
);
const provider = fs.readFileSync(
  'src/core/localization/LocaleProvider.tsx',
  'utf8',
);
const resolver = fs.readFileSync(
  'src/core/localization/resolveSystemLocale.ts',
  'utf8',
);
const resolvedLocale = fs.readFileSync(
  'src/core/localization/useResolvedAppLocale.ts',
  'utf8',
);
const directionBoundary = fs.readFileSync(
  'src/core/localization/AppDirectionBoundary.tsx',
  'utf8',
);

test(
  'app locale type is independent from provider composition',
  () => {
    assert.match(
      localeType,
      /export type AppLocale =\s*\| 'en'\s*\| 'ar'\s*\| 'de'/,
    );
    assert.match(
      resolver,
      /from '\.\/AppLocale'/,
    );
    assert.doesNotMatch(
      resolver,
      /LocaleProvider/,
    );
    assert.match(
      provider,
      /export type \{\s*AppLocale,\s*\} from '\.\/AppLocale'/,
    );
  },
);

test(
  'locale provider delegates system resolution to one focused hook',
  () => {
    assert.match(
      provider,
      /useResolvedAppLocale\(\s*settings\.language,\s*\)/,
    );
    assert.doesNotMatch(
      provider,
      /resolveSystemLocale/,
    );
    assert.doesNotMatch(
      provider,
      /\bAppState\b/,
    );
    assert.doesNotMatch(
      provider,
      /\bPlatform\b/,
    );
  },
);

test(
  'system locale refreshes when Android returns to the foreground',
  () => {
    assert.match(
      resolvedLocale,
      /if \(preference !== 'system'\) \{\s*return;/,
    );
    assert.match(
      resolvedLocale,
      /refresh\(\);/,
    );
    assert.match(
      resolvedLocale,
      /if \(Platform\.OS !== 'android'\) \{\s*return;/,
    );
    assert.match(
      resolvedLocale,
      /AppState\.addEventListener\(\s*'change'/,
    );
    assert.match(
      resolvedLocale,
      /if \(state === 'active'\) \{\s*refresh\(\);/,
    );
    assert.match(
      resolvedLocale,
      /subscription\.remove\(\);/,
    );
  },
);

test(
  'explicit language preferences bypass the system locale result',
  () => {
    assert.match(
      resolvedLocale,
      /return preference === 'system'\s*\? systemLocale\s*:\s*preference;/,
    );
  },
);

test(
  'RTL remains declarative and centrally derived from the resolved locale',
  () => {
    assert.match(
      provider,
      /isRTL:\s*locale\s*=== 'ar'/,
    );
    assert.match(
      directionBoundary,
      /direction:\s*isRTL\s*\? 'rtl'\s*:\s*'ltr'/,
    );
    assert.doesNotMatch(
      provider + resolvedLocale + directionBoundary,
      /I18nManager\.(?:allowRTL|forceRTL|swapLeftAndRightInRTL)/,
    );
  },
);

test(
  'localization foreground refresh does not emit raw runtime errors',
  () => {
    assert.doesNotMatch(
      resolvedLocale,
      /console\.(?:log|warn|error)/,
    );
    assert.doesNotMatch(
      resolvedLocale,
      /throw new Error/,
    );
  },
);
