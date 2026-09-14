import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const installScriptPath =
  'scripts/install-frozen-dependencies.sh';
const installScript = fs.readFileSync(
  installScriptPath,
  'utf8',
);
const mobileCoreWorkflow = fs.readFileSync(
  '.github/workflows/mobile-core-validation.yml',
  'utf8',
);
const androidWorkflow = fs.readFileSync(
  '.github/workflows/android-device-validation-apk.yml',
  'utf8',
);

test(
  'frozen dependency installer stays executable and reproducible',
  () => {
    const mode = fs.statSync(installScriptPath).mode;

    assert.notEqual(mode & 0o111, 0);
    assert.match(installScript, /--frozen-lockfile/);
    assert.match(installScript, /--non-interactive/);
    assert.match(installScript, /--network-timeout/);
    assert.match(installScript, /readonly MAX_ATTEMPTS=3/);
  },
);

test(
  'dependency install retries only recognized transient registry or network failures',
  () => {
    for (const signal of [
      '5[0-9]{2}',
      'ETIMEDOUT',
      'ECONNRESET',
      'EAI_AGAIN',
      'ENETUNREACH',
    ]) {
      assert.match(
        installScript,
        new RegExp(signal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      );
    }

    assert.match(
      installScript,
      /non-transient error; not retrying/,
    );
    assert.match(
      installScript,
      /attempt == MAX_ATTEMPTS/,
    );
  },
);

test(
  'core and Android validation share the same dependency install policy',
  () => {
    for (const workflow of [
      mobileCoreWorkflow,
      androidWorkflow,
    ]) {
      assert.match(
        workflow,
        /run: \.\/scripts\/install-frozen-dependencies\.sh/,
      );
      assert.doesNotMatch(
        workflow,
        /run: yarn install --frozen-lockfile/,
      );
    }
  },
);
