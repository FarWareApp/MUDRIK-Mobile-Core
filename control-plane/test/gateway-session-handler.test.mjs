import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GatewaySessionAuthority,
} from '../src/gateway-session-authority.mjs';

import {
  createGatewaySessionHandler,
} from '../src/gateway-session-handler.mjs';

const SECRET =
  'session-signing-secret-abcdefghijklmnopqrstuvwxyz-0123456789';

const ADMIN =
  'gateway-admin-token-abcdefghijklmnopqrstuvwxyz-0123456789';

const NOW = 60_000_000;

function request(
  token = ADMIN,
  body = {
    protocolVersion: '1.0',
    accountId:
      'acct_1111111111111111',
    deviceId:
      'dev_1111111111111111',
  },
) {
  return new Request(
    'https://gateway.example/v1/internal/session',
    {
      method: 'POST',
      headers: {
        authorization:
          'Bearer ' + token,
        'content-type':
          'application/json',
      },
      body: JSON.stringify(body),
    },
  );
}

test(
  'internal session endpoint exchanges admin credential for short-lived device session',
  async () => {
    const authority =
      new GatewaySessionAuthority(
        SECRET,
      );

    const handler =
      createGatewaySessionHandler({
        accessToken: ADMIN,
        sessionAuthority:
          authority,
        clock: () => NOW,
      });

    const response =
      await handler(
        request(),
      );

    assert.equal(
      response.status,
      200,
    );

    const body =
      await response.json();

    assert.equal(
      body.protocolVersion,
      '1.0',
    );

    const verified =
      authority.verify(
        body.accessToken,
        NOW + 1000,
      );

    assert.equal(
      verified.accountId,
      'acct_1111111111111111',
    );
    assert.equal(
      verified.deviceId,
      'dev_1111111111111111',
    );
  },
);

test(
  'internal session endpoint rejects invalid admin credential before issuing token',
  async () => {
    const authority =
      new GatewaySessionAuthority(
        SECRET,
      );

    const handler =
      createGatewaySessionHandler({
        accessToken: ADMIN,
        sessionAuthority:
          authority,
        clock: () => NOW,
      });

    const response =
      await handler(
        request(
          'gateway-admin-token-invalid-invalid-invalid-invalid',
        ),
      );

    assert.equal(
      response.status,
      401,
    );
  },
);
