import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const localeType = fs.readFileSync(
  'src/core/localization/AppLocale.ts',
  'utf8',
);
const localeRegistry = fs.readFileSync(
  'src/core/localization/localeRegistry.ts',
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
const catalog = fs.readFileSync(
  'src/core/localization/translationCatalog.ts',
  'utf8',
);
const betaOverlays = fs.readFileSync(
  'src/core/localization/betaTranslationOverlays.ts',
  'utf8',
);

const supportedLocales = [
  'ar', 'de', 'en', 'tr', 'fr', 'es', 'it', 'pt', 'ru',
];

test(
  'locale support is centralized in a scalable registry',
  () => {
    assert.ok(localeType.includes("from './localeRegistry'"));
    assert.ok(localeRegistry.includes('SUPPORTED_LOCALES'));

    for (const locale of supportedLocales) {
      assert.ok(
        localeRegistry.includes("'" + locale + "'"),
        locale,
      );
      assert.ok(
        localeRegistry.includes(locale + ': {'),
        locale,
      );
    }

    assert.ok(localeRegistry.includes("maturity: 'complete'"));
    assert.ok(localeRegistry.includes("maturity: 'beta'"));
    assert.ok(localeRegistry.includes('nativeLabel:'));
    assert.ok(localeRegistry.includes('intlTag:'));
  },
);

test(
  'locale provider delegates system resolution to one focused hook',
  () => {
    assert.ok(provider.includes('useResolvedAppLocale('));
    assert.ok(provider.includes('settings.language'));
    assert.ok(!provider.includes('resolveSystemLocale'));
    assert.ok(!provider.includes('AppState'));
    assert.ok(!provider.includes('Platform'));
  },
);

test(
  'system locale refreshes when Android returns to the foreground',
  () => {
    assert.ok(resolvedLocale.includes("if (preference !== 'system')"));
    assert.ok(resolvedLocale.includes('refresh();'));
    assert.ok(resolvedLocale.includes("Platform.OS !== 'android'"));
    assert.ok(resolvedLocale.includes("AppState.addEventListener("));
    assert.ok(resolvedLocale.includes("'change'"));
    assert.ok(resolvedLocale.includes("state === 'active'"));
    assert.ok(resolvedLocale.includes('subscription.remove();'));
  },
);

test(
  'system locale resolution recognizes supported languages and falls back safely',
  () => {
    assert.ok(resolver.includes('isAppLocale(languageCode)'));
    assert.ok(resolver.includes("? languageCode"));
    assert.ok(resolver.includes(": 'en'"));
    assert.ok(resolver.includes("return 'en';"));
  },
);

test(
  'explicit language preferences bypass the system locale result',
  () => {
    assert.ok(resolvedLocale.includes("preference === 'system'"));
    assert.ok(resolvedLocale.includes('? systemLocale'));
    assert.ok(resolvedLocale.includes(': preference'));
  },
);

test(
  'RTL remains declarative and centrally derived from the locale registry',
  () => {
    assert.ok(provider.includes('isRTL: isRtlLocale(locale)'));
    assert.ok(localeRegistry.includes('ar: {'));
    assert.ok(localeRegistry.includes("direction: 'rtl'"));
    assert.match(
      directionBoundary,
      /isRTL[\s\S]*?\? 'rtl'[\s\S]*?: 'ltr'/,
    );
    assert.ok(!provider.includes('I18nManager.forceRTL'));
    assert.ok(!resolvedLocale.includes('I18nManager.forceRTL'));
    assert.ok(!directionBoundary.includes('I18nManager.forceRTL'));
  },
);

test(
  'beta locales receive complete catalogs through English fallback overlays',
  () => {
    assert.ok(catalog.includes('function buildBetaCatalog'));
    assert.ok(catalog.includes('...englishCatalog'));
    assert.ok(catalog.includes('...betaTranslationOverlays[locale]'));

    for (const locale of ['tr', 'fr', 'es', 'it', 'pt', 'ru']) {
      assert.ok(
        catalog.includes(
          locale + ": buildBetaCatalog('" + locale + "')",
        ),
        locale,
      );
      assert.ok(
        betaOverlays.includes(locale + ': {'),
        locale,
      );
    }
  },
);

test(
  'localization foreground refresh does not emit raw runtime errors',
  () => {
    assert.doesNotMatch(
      resolvedLocale,
      /console\.(?:log|warn|error)/,
    );
    assert.doesNotMatch(resolvedLocale, /throw new Error/);
  },
);
