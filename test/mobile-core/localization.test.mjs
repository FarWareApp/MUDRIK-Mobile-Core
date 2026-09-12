import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  translations,
} = loadTypeScriptModule(
  'src/core/localization/translations.ts',
);

function sortedKeys(value) {
  return Object.keys(value).sort();
}

test(
  'Arabic German and English translation dictionaries expose identical keys',
  () => {
    const englishKeys =
      sortedKeys(translations.en);

    assert.deepEqual(
      sortedKeys(translations.ar),
      englishKeys,
    );
    assert.deepEqual(
      sortedKeys(translations.de),
      englishKeys,
    );
  },
);

test(
  'translation values are non-empty strings in every supported locale',
  () => {
    for (const locale of [
      'ar',
      'de',
      'en',
    ]) {
      for (const [key, value] of
        Object.entries(
          translations[locale],
        )) {
        assert.equal(
          typeof value,
          'string',
          `${locale}.${key} must be a string`,
        );
        assert.notEqual(
          value.trim(),
          '',
          `${locale}.${key} must not be empty`,
        );
      }
    }
  },
);
