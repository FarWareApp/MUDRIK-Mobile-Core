import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  resolveRuntimeMode,
} = loadTypeScriptModule(
  'src/core/runtime/RuntimeModeResolver.ts',
);

function snapshot(
  isConnected,
  isInternetReachable,
) {
  return {
    isConnected,
    isInternetReachable,
    kind: isConnected ? 'wifi' : 'none',
    isExpensive: false,
    changedAt: 1,
  };
}

test(
  'runtime is offline when transport is disconnected regardless of reachability probe',
  () => {
    assert.equal(
      resolveRuntimeMode(
        snapshot(false, true),
      ),
      'offline',
    );
    assert.equal(
      resolveRuntimeMode(
        snapshot(false, null),
      ),
      'offline',
    );
  },
);

test(
  'runtime is offline when internet is explicitly unreachable',
  () => {
    assert.equal(
      resolveRuntimeMode(
        snapshot(true, false),
      ),
      'offline',
    );
  },
);

test(
  'runtime is online for connected reachable or not-yet-known reachability',
  () => {
    assert.equal(
      resolveRuntimeMode(
        snapshot(true, true),
      ),
      'online',
    );
    assert.equal(
      resolveRuntimeMode(
        snapshot(true, null),
      ),
      'online',
    );
  },
);
