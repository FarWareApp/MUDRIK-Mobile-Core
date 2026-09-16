import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const provider = fs.readFileSync(
  'src/core/lifecycle/LifecycleProvider.tsx',
  'utf8',
);
const observer = fs.readFileSync(
  'src/core/lifecycle/useSystemLifecycleState.ts',
  'utf8',
);

const {
  resolveAppLifecyclePhase,
} = loadTypeScriptModule(
  'src/core/lifecycle/AppLifecyclePhaseResolver.ts',
);

test(
  'lifecycle provider remains composition-only',
  () => {
    assert.match(
      provider,
      /useSystemLifecycleState\(\)/,
    );
    assert.match(
      provider,
      /resolveAppLifecyclePhase/,
    );
    assert.doesNotMatch(
      provider,
      /AppState\.addEventListener/,
    );
    assert.doesNotMatch(
      provider,
      /diagnosticsService/,
    );
    assert.doesNotMatch(
      provider,
      /\buseEffect\b|\buseState\b/,
    );
    assert.doesNotMatch(
      provider,
      /Date\.now/,
    );
  },
);

test(
  'native lifecycle observer subscribes before reconciling the current state',
  () => {
    const subscriptionIndex =
      observer.indexOf(
        'AppState.addEventListener(',
      );
    const reconcileIndex =
      observer.lastIndexOf(
        'AppState.currentState',
      );

    assert.notEqual(
      subscriptionIndex,
      -1,
    );
    assert.notEqual(
      reconcileIndex,
      -1,
    );
    assert.ok(
      subscriptionIndex <
      reconcileIndex,
    );
    assert.match(
      observer,
      /subscription\.remove\(\)/,
    );
  },
);

test(
  'duplicate native lifecycle events do not advance the change timestamp',
  () => {
    const duplicateGuardIndex =
      observer.indexOf(
        'nextState ===',
      );
    const timestampIndex =
      observer.indexOf(
        'Date.now()',
      );

    assert.notEqual(
      duplicateGuardIndex,
      -1,
    );
    assert.notEqual(
      timestampIndex,
      -1,
    );
    assert.ok(
      duplicateGuardIndex <
      timestampIndex,
    );
    assert.match(
      observer,
      /lastChangedAt:\s*0/,
    );
    assert.equal(
      observer.match(/Date\.now\(\)/g)?.length ?? 0,
      1,
    );
  },
);

test(
  'lifecycle diagnostics stay bounded to stable app-state labels',
  () => {
    assert.match(
      observer,
      /`initial:\$\{currentStateRef\.current\}`/,
    );
    assert.match(
      observer,
      /`state:\$\{nextState\}`/,
    );
    assert.doesNotMatch(
      observer,
      /console\./,
    );
    assert.doesNotMatch(
      observer,
      /throw new Error/,
    );
  },
);

test(
  'lifecycle phase resolver preserves the public phase contract',
  () => {
    assert.equal(
      resolveAppLifecyclePhase('active'),
      'active',
    );
    assert.equal(
      resolveAppLifecyclePhase('inactive'),
      'inactive',
    );
    assert.equal(
      resolveAppLifecyclePhase('background'),
      'background',
    );
    assert.equal(
      resolveAppLifecyclePhase('unknown'),
      'unknown',
    );
    assert.equal(
      resolveAppLifecyclePhase('extension'),
      'unknown',
    );
  },
);
