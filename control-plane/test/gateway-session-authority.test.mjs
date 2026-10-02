import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GatewaySessionAuthority,
} from '../src/gateway-session-authority.mjs';

const SECRET =
  'session-signing-secret-abcdefghijklmnopqrstuvwxyz-0123456789';

const NOW = 50_000_000;

const ACCOUNT =
  'acct_1111111111111111';

const DEVICE =
  'dev_1111111111111111';

test(
  'session authority issues and verifies short-lived device-bound tokens',
  () => {
    const authority =
      new GatewaySessionAuthority(
        SECRET,
      );

    const issued =
      authority.issue({
        accountId: ACCOUNT,
        deviceId: DEVICE,
        nowMs: NOW,
      });

    const verified =
      authority.verify(
        issued.token,
        NOW + 1000,
      );

    assert.equal(
      verified.accountId,
      ACCOUNT,
    );
    assert.equal(
      verified.deviceId,
      DEVICE,
    );
    assert.equal(
      verified.sessionId,
      issued.session.sessionId,
    );
  },
);

test(
  'tampered session token fails closed',
  () => {
    const authority =
      new GatewaySessionAuthority(
        SECRET,
      );

    const issued =
      authority.issue({
        accountId: ACCOUNT,
        deviceId: DEVICE,
        nowMs: NOW,
      });

    const tampered =
      issued.token.slice(0, -1)
      + (
        issued.token.endsWith('a')
          ? 'b'
          : 'a'
      );

    assert.equal(
      authority.verify(
        tampered,
        NOW + 1000,
      ),
      null,
    );
  },
);

test(
  'expired session token is rejected',
  () => {
    const authority =
      new GatewaySessionAuthority(
        SECRET,
      );

    const issued =
      authority.issue({
        accountId: ACCOUNT,
        deviceId: DEVICE,
        nowMs: NOW,
        ttlMs: 60_000,
      });

    assert.equal(
      authority.verify(
        issued.token,
        NOW + 60_000,
      ),
      null,
    );
  },
);

test(
  'different signing authority cannot validate token',
  () => {
    const authority =
      new GatewaySessionAuthority(
        SECRET,
      );

    const other =
      new GatewaySessionAuthority(
        SECRET + '-other',
      );

    const issued =
      authority.issue({
        accountId: ACCOUNT,
        deviceId: DEVICE,
        nowMs: NOW,
      });

    assert.equal(
      other.verify(
        issued.token,
        NOW + 1000,
      ),
      null,
    );
  },
);

test(
  'session lifetime cannot exceed fifteen minutes',
  () => {
    const authority =
      new GatewaySessionAuthority(
        SECRET,
      );

    assert.throws(
      () =>
        authority.issue({
          accountId: ACCOUNT,
          deviceId: DEVICE,
          nowMs: NOW,
          ttlMs:
            15 * 60 * 1000 + 1,
        }),
      /Invalid gateway session issue request/,
    );
  },
);
