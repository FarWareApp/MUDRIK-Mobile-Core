import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  GatewaySessionUnavailableError,
  VolatileGatewaySessionTokenStore,
} = loadTypeScriptModule(
  'src/core/intelligence/GatewaySessionTokenStore.ts',
);

test(
  'volatile gateway session token is never exposed by snapshots or JSON',
  async () => {
    const store =
      new VolatileGatewaySessionTokenStore();

    const token =
      'gateway-session-token-abcdefghijklmnopqrstuvwxyz';

    store.set(token);

    assert.equal(
      await store.getAccessToken(),
      token,
    );

    assert.deepEqual(
      store.snapshot(),
      {
        available: true,
        generation: 1,
      },
    );

    assert.equal(
      JSON.stringify(store)
        .includes(token),
      false,
    );
  },
);

test(
  'clearing session invalidates access immediately',
  async () => {
    const store =
      new VolatileGatewaySessionTokenStore();

    store.set(
      'gateway-session-token-abcdefghijklmnopqrstuvwxyz',
    );
    store.clear();

    await assert.rejects(
      store.getAccessToken(),
      GatewaySessionUnavailableError,
    );

    assert.deepEqual(
      store.snapshot(),
      {
        available: false,
        generation: 2,
      },
    );
  },
);

test(
  'unsafe or too-short tokens are rejected',
  () => {
    const store =
      new VolatileGatewaySessionTokenStore();

    assert.throws(
      () => store.set('short'),
      /Invalid gateway session token/,
    );

    assert.throws(
      () =>
        store.set(
          'gateway-session-token-abcdefghijkl\nmalicious',
        ),
      /Invalid gateway session token/,
    );
  },
);
