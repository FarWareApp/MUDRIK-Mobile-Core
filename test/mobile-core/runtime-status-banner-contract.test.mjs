import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const banner = fs.readFileSync(
  'src/core/runtime/RuntimeStatusBanner.tsx',
  'utf8',
);
const runtimeTranslations = fs.readFileSync(
  'src/core/localization/runtimeTranslations.ts',
  'utf8',
);
const translationCatalog = fs.readFileSync(
  'src/core/localization/translationCatalog.ts',
  'utf8',
);

function countTranslationKey(source, key) {
  const pattern = new RegExp(
    `^\\s*${key}:\\s`,
    'gm',
  );

  return source.match(pattern)?.length ?? 0;
}

test(
  'runtime offline banner is localized and uses design-system metrics',
  () => {
    assert.match(banner, /useLocale/);
    assert.match(banner, /t\('offlineStatus'\)/);
    assert.match(
      banner,
      /t\('offlineLocalFeaturesAvailable'\)/,
    );
    assert.match(banner, /\.\.\.typeScale\.caption/);
    assert.match(banner, /\.\.\.typeScale\.micro/);
    assert.match(banner, /paddingHorizontal:\s*spacing\.md/);
    assert.match(banner, /paddingVertical:\s*spacing\.xs/);
    assert.match(banner, /minHeight:\s*44/);
    assert.doesNotMatch(
      banner,
      />\s*Offline\s*</,
    );
    assert.doesNotMatch(
      banner,
      /Local app features remain available\./,
    );
  },
);

test(
  'runtime offline copy exists in Arabic German and English',
  () => {
    for (const key of [
      'offlineStatus',
      'offlineLocalFeaturesAvailable',
    ]) {
      assert.equal(
        countTranslationKey(
          runtimeTranslations,
          key,
        ),
        3,
        `${key} must exist in ar, de and en`,
      );
    }

    for (const locale of ['ar', 'de', 'en']) {
      assert.match(
        translationCatalog,
        new RegExp(
          `${locale}: \\{[\\s\\S]*?\\.\\.\\.runtimeTranslations\\.${locale}`,
        ),
      );
    }
  },
);
