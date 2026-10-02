import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  GatewaySessionManager,
} = loadTypeScriptModule(
  'src/core/intelligence/GatewaySessionManager.ts',
);

const {
  GatewaySessionUnavailableError,
} = loadTypeScriptModule(
  'src/core/intelligence/GatewaySessionTokenStore.ts',
);

const NOW = 10_000_000;

function lease(
  overrides = {},
) {
  return {
    accessToken:
      'gateway-session-token-abcdefghijklmnopqrstuvwxyz',
    issuedAtMs: NOW,
    expiresAtMs:
      NOW + 10 * 60 * 1000,
    ...overrides,
  };
}

test(
  'session manager exposes token only through access boundary',
  async () => {
    const manager =
      new GatewaySessionManager(
        null,
        () => NOW,
      );

    manager.install(
      lease(),
    );

    assert.equal(
      await manager.getAccessToken(),
      lease().accessToken,
    );

    assert.equal(
      JSON.stringify(manager)
        .includes(
          lease().accessToken,
        ),
      false,
    );

    assert.deepEqual(
      manager.snapshot(),
      {
        available: true,
        expiresAtMs:
          NOW + 10 * 60 * 1000,
        generation: 1,
        refreshable: false,
      },
    );
  },
);

test(
  'expired session fails closed without refresh authority',
  async () => {
    let now = NOW;

    const manager =
      new GatewaySessionManager(
        null,
        () => now,
        0,
      );

    manager.install(
      lease({
        expiresAtMs:
          NOW + 1000,
      }),
    );

    now = NOW + 1000;

    await assert.rejects(
      manager.getAccessToken(),
      GatewaySessionUnavailableError,
    );
  },
);

test(
  'concurrent refresh collapses to one refresh operation',
  async () => {
    let calls = 0;

    const manager =
      new GatewaySessionManager(
        {
          async refresh() {
            calls += 1;

            await new Promise(
              (resolve) =>
                setTimeout(
                  resolve,
                  5,
                ),
            );

            return lease();
          },
        },
        () => NOW,
      );

    const values =
      await Promise.all([
        manager.getAccessToken(),
        manager.getAccessToken(),
        manager.getAccessToken(),
      ]);

    assert.equal(calls, 1);
    assert.deepEqual(
      new Set(values),
      new Set([
        lease().accessToken,
      ]),
    );
  },
);

test(
  'invalid refresh result clears session and fails closed',
  async () => {
    const manager =
      new GatewaySessionManager(
        {
          async refresh() {
            return {
              accessToken: 'short',
              issuedAtMs: NOW,
              expiresAtMs:
                NOW + 1000,
            };
          },
        },
        () => NOW,
      );

    await assert.rejects(
      manager.getAccessToken(),
      GatewaySessionUnavailableError,
    );

    assert.equal(
      manager.snapshot().available,
      false,
    );
  },
);

test(
  'session lifetime beyond fifteen minutes is rejected',
  () => {
    const manager =
      new GatewaySessionManager(
        null,
        () => NOW,
      );

    assert.throws(
      () =>
        manager.install(
          lease({
            expiresAtMs:
              NOW
              + 15 * 60 * 1000
              + 1,
          }),
        ),
      /Invalid gateway session lease/,
    );
  },
);
