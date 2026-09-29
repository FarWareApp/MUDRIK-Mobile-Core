import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PresenceRegistry,
} from '../src/presence.mjs';

import {
  DeterministicReconnectPolicy,
  reconnectDelayMs,
} from '../src/reconnect-backoff.mjs';

import {
  FixedWindowRateLimiter,
} from '../src/rate-limiter.mjs';

const DEVICE =
  'dev_7777777777777777';
const CONNECTION =
  'cpconn_7777777777777777';
const CONNECTION_2 =
  'cpconn_8888888888888888';
const NOW = 5_000_000;

test(
  'presence degrades and expires using trusted time without creating authority',
  () => {
    const registry =
      new PresenceRegistry({
        healthyHeartbeatMs: 1_000,
        livenessTimeoutMs: 3_000,
        reconnectWindowMs: 4_000,
        degradedRttMs: 500,
      });

    const connected =
      registry.connect(
        {
          deviceId: DEVICE,
          connectionId:
            CONNECTION,
        },
        NOW,
      );

    assert.equal(
      connected.accepted,
      true,
    );
    assert.equal(
      connected.record.state,
      'online',
    );
    assert.equal(
      connected.record
        .grantsAuthority,
      false,
    );

    assert.equal(
      registry.get(
        DEVICE,
        NOW + 500,
      ).state,
      'online',
    );

    assert.equal(
      registry.get(
        DEVICE,
        NOW + 2_000,
      ).state,
      'degraded',
    );

    assert.equal(
      registry.get(
        DEVICE,
        NOW + 4_000,
      ).state,
      'reconnecting',
    );

    assert.equal(
      registry.get(
        DEVICE,
        NOW + 8_000,
      ).state,
      'offline',
    );
  },
);

test(
  'high RTT or backpressure makes presence degraded immediately',
  () => {
    const registry =
      new PresenceRegistry({
        healthyHeartbeatMs: 1_000,
        livenessTimeoutMs: 3_000,
        reconnectWindowMs: 4_000,
        degradedRttMs: 500,
      });

    registry.connect(
      {
        deviceId: DEVICE,
        connectionId:
          CONNECTION,
      },
      NOW,
    );

    const slow =
      registry.heartbeat(
        {
          deviceId: DEVICE,
          connectionId:
            CONNECTION,
          rttMs: 700,
          backpressured: false,
        },
        NOW + 100,
      );

    assert.equal(
      slow.record.state,
      'degraded',
    );

    const pressured =
      registry.heartbeat(
        {
          deviceId: DEVICE,
          connectionId:
            CONNECTION,
          rttMs: 10,
          backpressured: true,
        },
        NOW + 200,
      );

    assert.equal(
      pressured.record.state,
      'degraded',
    );
  },
);

test(
  'disconnected or stale connection cannot revive with late heartbeat or reused connection id',
  () => {
    const registry =
      new PresenceRegistry({
        healthyHeartbeatMs: 1_000,
        livenessTimeoutMs: 3_000,
        reconnectWindowMs: 4_000,
      });

    registry.connect(
      {
        deviceId: DEVICE,
        connectionId:
          CONNECTION,
      },
      NOW,
    );

    const disconnected =
      registry.disconnect(
        {
          deviceId: DEVICE,
          connectionId:
            CONNECTION,
        },
        NOW + 100,
      );

    assert.equal(
      disconnected.record.state,
      'reconnecting',
    );

    assert.equal(
      registry.heartbeat(
        {
          deviceId: DEVICE,
          connectionId:
            CONNECTION,
          rttMs: 10,
        },
        NOW + 200,
      ).accepted,
      false,
    );

    assert.equal(
      registry.connect(
        {
          deviceId: DEVICE,
          connectionId:
            CONNECTION,
        },
        NOW + 200,
      ).reason,
      'presence_connection_replay',
    );

    const reconnected =
      registry.connect(
        {
          deviceId: DEVICE,
          connectionId:
            CONNECTION_2,
        },
        NOW + 200,
      );

    assert.equal(
      reconnected.accepted,
      true,
    );
    assert.equal(
      reconnected.record.state,
      'online',
    );
  },
);

test(
  'presence revocation is terminal advisory state and blocks reconnect',
  () => {
    const registry =
      new PresenceRegistry();

    registry.connect(
      {
        deviceId: DEVICE,
        connectionId:
          CONNECTION,
      },
      NOW,
    );

    const revoked =
      registry.revoke(
        DEVICE,
        NOW + 1,
      );

    assert.equal(
      revoked.accepted,
      true,
    );
    assert.equal(
      revoked.record.state,
      'revoked',
    );
    assert.equal(
      revoked.record
        .grantsAuthority,
      false,
    );

    assert.equal(
      registry.connect(
        {
          deviceId: DEVICE,
          connectionId:
            CONNECTION_2,
        },
        NOW + 2,
      ).reason,
      'presence_revoked',
    );

    assert.equal(
      registry.revoke(
        DEVICE,
        NOW + 3,
      ).duplicate,
      true,
    );
  },
);

test(
  'presence rejects trusted-time rollback and wrong connection identity',
  () => {
    const registry =
      new PresenceRegistry();

    registry.connect(
      {
        deviceId: DEVICE,
        connectionId:
          CONNECTION,
      },
      NOW,
    );

    assert.equal(
      registry.heartbeat(
        {
          deviceId: DEVICE,
          connectionId:
            CONNECTION_2,
        },
        NOW + 10,
      ).accepted,
      false,
    );

    registry.heartbeat(
      {
        deviceId: DEVICE,
        connectionId:
          CONNECTION,
      },
      NOW + 20,
    );

    assert.equal(
      registry.heartbeat(
        {
          deviceId: DEVICE,
          connectionId:
            CONNECTION,
        },
        NOW + 19,
      ).accepted,
      false,
    );
  },
);

test(
  'reconnect backoff is bounded exponential and deterministic for injected jitter',
  () => {
    const policy =
      new DeterministicReconnectPolicy({
        baseDelayMs: 500,
        maxDelayMs: 8_000,
        jitterFraction: 0.2,
      });

    assert.equal(
      policy.delay(0, 0.5),
      500,
    );
    assert.equal(
      policy.delay(1, 0.5),
      1_000,
    );
    assert.equal(
      policy.delay(4, 0.5),
      8_000,
    );

    assert.equal(
      policy.delay(1, 0),
      800,
    );
    assert.equal(
      policy.delay(1, 1),
      1_200,
    );

    assert.equal(
      reconnectDelayMs({
        attempt: 2,
        baseDelayMs: 100,
        maxDelayMs: 10_000,
        jitterFraction: 0.25,
        jitterUnit: 0.25,
      }),
      reconnectDelayMs({
        attempt: 2,
        baseDelayMs: 100,
        maxDelayMs: 10_000,
        jitterFraction: 0.25,
        jitterUnit: 0.25,
      }),
    );

    assert.equal(
      reconnectDelayMs({
        attempt: -1,
      }),
      null,
    );
  },
);

test(
  'fixed window limiter blocks event flood and returns bounded retry delay',
  () => {
    const limiter =
      new FixedWindowRateLimiter({
        windowMs: 1_000,
        maxEvents: 3,
      });

    for (
      let index = 0;
      index < 3;
      index += 1
    ) {
      assert.equal(
        limiter.check(
          'device:one',
          NOW,
        ).allowed,
        true,
      );
    }

    const denied =
      limiter.check(
        'device:one',
        NOW + 100,
      );

    assert.equal(
      denied.allowed,
      false,
    );
    assert.equal(
      denied.reason,
      'rate_limited',
    );
    assert.equal(
      denied.retryAfterMs,
      900,
    );

    assert.equal(
      limiter.check(
        'device:one',
        NOW + 1_000,
      ).allowed,
      true,
    );
  },
);

test(
  'rate limiter isolates keys rejects time rollback and bounds key cardinality',
  () => {
    const limiter =
      new FixedWindowRateLimiter({
        windowMs: 1_000,
        maxEvents: 1,
        maxKeys: 2,
      });

    assert.equal(
      limiter.check(
        'account:a',
        NOW,
      ).allowed,
      true,
    );
    assert.equal(
      limiter.check(
        'device:b',
        NOW,
      ).allowed,
      true,
    );
    assert.equal(
      limiter.check(
        'session:c',
        NOW,
      ).reason,
      'rate_limit_key_capacity',
    );

    assert.equal(
      limiter.check(
        'account:a',
        NOW - 1,
      ).reason,
      'rate_limit_time_rollback',
    );

    assert.equal(
      limiter.cleanup(
        NOW + 1_000,
      ),
      2,
    );

    assert.equal(
      limiter.check(
        'session:c',
        NOW + 1_000,
      ).allowed,
      true,
    );
  },
);

test(
  'rate limiter reclaims expired keys automatically before cardinality rejection',
  () => {
    const limiter =
      new FixedWindowRateLimiter({
        windowMs: 100,
        maxEvents: 1,
        maxKeys: 1,
      });

    assert.equal(
      limiter.check(
        'device:first',
        NOW,
      ).allowed,
      true,
    );

    assert.equal(
      limiter.check(
        'device:second',
        NOW + 101,
      ).allowed,
      true,
    );
  },
);
