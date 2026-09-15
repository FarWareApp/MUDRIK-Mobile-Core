import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  DIAGNOSTIC_EVENT_LIMIT,
  mergeDiagnosticEvents,
} = loadTypeScriptModule(
  'src/features/diagnostics/mergeDiagnosticEvents.ts',
);

const stored = [
  {
    id: 'older',
    timestamp: 100,
    module: 'storage',
    event: 'stored older',
    level: 'info',
  },
  {
    id: 'shared',
    timestamp: 200,
    module: 'runtime',
    event: 'stored copy',
    level: 'warning',
  },
  {
    id: 'same-b',
    timestamp: 300,
    module: 'network',
    event: 'tie b',
    level: 'info',
  },
  {
    id: 'same-a',
    timestamp: 300,
    module: 'network',
    event: 'tie a',
    level: 'info',
  },
];

const runtime = [
  {
    id: 'shared',
    timestamp: 400,
    module: 'runtime',
    event: 'runtime copy',
    level: 'error',
  },
  {
    id: 'newest',
    timestamp: 500,
    module: 'voice',
    event: 'runtime newest',
    level: 'info',
  },
];

test(
  'diagnostic merge prefers runtime duplicates and sorts deterministically',
  () => {
    const result = mergeDiagnosticEvents(stored, runtime, 10);

    assert.deepEqual(
      result.map((event) => event.id),
      ['newest', 'shared', 'same-a', 'same-b', 'older'],
    );
    assert.equal(
      result.find((event) => event.id === 'shared')?.event,
      'runtime copy',
    );
  },
);

test(
  'diagnostic merge respects limits without mutating inputs',
  () => {
    const storedIds = stored.map((event) => event.id);
    const runtimeIds = runtime.map((event) => event.id);
    const result = mergeDiagnosticEvents(stored, runtime, 2);

    assert.deepEqual(
      result.map((event) => event.id),
      ['newest', 'shared'],
    );
    assert.deepEqual(
      stored.map((event) => event.id),
      storedIds,
    );
    assert.deepEqual(
      runtime.map((event) => event.id),
      runtimeIds,
    );
    assert.equal(DIAGNOSTIC_EVENT_LIMIT, 100);
  },
);

test(
  'diagnostic merge clamps invalid negative limits to an empty result',
  () => {
    assert.deepEqual(
      mergeDiagnosticEvents(stored, runtime, -4),
      [],
    );
  },
);
