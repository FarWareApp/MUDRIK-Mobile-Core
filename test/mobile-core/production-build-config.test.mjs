import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const eas = JSON.parse(
  fs.readFileSync('eas.json', 'utf8'),
);
const pkg = JSON.parse(
  fs.readFileSync('package.json', 'utf8'),
);
const preflight = fs.readFileSync(
  'scripts/production-release-preflight.mjs',
  'utf8',
);
const app = JSON.parse(
  fs.readFileSync('app.json', 'utf8'),
);

test(
  'production EAS profile uses remote versions, auto increment and store-safe artifact defaults',
  () => {
    assert.equal(
      eas.cli?.requireCommit,
      true,
    );
    assert.equal(
      eas.cli?.appVersionSource,
      'remote',
    );
    assert.equal(
      eas.build?.production?.autoIncrement,
      true,
    );
    assert.equal(
      eas.build?.production?.environment,
      'production',
    );
    assert.notEqual(
      eas.build?.production?.android?.buildType,
      'apk',
    );
    assert.deepEqual(
      eas.submit?.production,
      {},
    );
  },
);

test(
  'preview remains internal and directly installable on Android',
  () => {
    assert.equal(
      eas.build?.preview?.distribution,
      'internal',
    );
    assert.equal(
      eas.build?.preview?.environment,
      'preview',
    );
    assert.equal(
      eas.build?.preview?.android?.buildType,
      'apk',
    );
  },
);

test(
  'production release preflight is exposed and verifies critical release invariants',
  () => {
    assert.equal(
      pkg.scripts?.['release:preflight'],
      'node ./scripts/production-release-preflight.mjs',
    );

    for (const contract of [
      "appVersionSource !== 'remote'",
      'production.autoIncrement !== true',
      "production.environment !== 'production'",
      "production.android.buildType !== 'app-bundle'",
      "preview.distribution !== 'internal'",
      "preview.environment !== 'preview'",
      "preview?.android?.buildType !== 'apk'",
    ]) {
      assert.match(
        preflight,
        new RegExp(
          contract.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        ),
      );
    }
  },
);

test(
  'predictive Android back remains intentionally disabled on the production stable stack',
  () => {
    assert.equal(
      app.expo?.android?.predictiveBackGestureEnabled,
      false,
    );
  },
);
