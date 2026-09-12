import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  authorizeCapability,
} = loadTypeScriptModule(
  'src/core/security/capabilityPolicy.ts',
);

const NOW = 9_000_000;

const baseGrant = Object.freeze({
  grantId: 'grant-unscoped',
  subjectId: 'device-a',
  capability: 'terminal.execute',
});

const baseRequest = Object.freeze({
  subjectId: 'device-a',
  capability: 'terminal.execute',
  nowMs: NOW,
});

test('an unscoped grant does not imply background authority', () => {
  const decision = authorizeCapability(
    {
      ...baseRequest,
      background: true,
    },
    [baseGrant],
  );

  assert.deepEqual(decision, {
    allowed: false,
    reason: 'background_not_allowed',
  });
});

test('an unscoped grant does not imply user or admin elevation', () => {
  assert.equal(
    authorizeCapability(
      {
        ...baseRequest,
        elevation: 'user',
      },
      [baseGrant],
    ).reason,
    'elevation_not_allowed',
  );

  assert.equal(
    authorizeCapability(
      {
        ...baseRequest,
        elevation: 'admin',
      },
      [baseGrant],
    ).reason,
    'elevation_not_allowed',
  );
});

test('ordinary foreground non-elevated use remains permitted by the explicit capability grant', () => {
  assert.deepEqual(
    authorizeCapability(baseRequest, [baseGrant]),
    {
      allowed: true,
      reason: 'allowed',
      grantId: 'grant-unscoped',
    },
  );
});

test('authorization is deterministic and never mutates caller grant/request objects', () => {
  const grant = {
    grantId: 'grant-scoped',
    subjectId: 'device-a',
    capability: 'filesystem.read',
    scope: {
      resourcePrefix: '/workspace/a',
      maxElevation: 'none',
    },
  };
  const request = {
    subjectId: 'device-a',
    capability: 'filesystem.read',
    nowMs: NOW,
    resourcePath: '/workspace/a/file.txt',
  };

  const beforeGrant = structuredClone(grant);
  const beforeRequest = structuredClone(request);

  const first = authorizeCapability(request, [grant]);
  const second = authorizeCapability(request, [grant]);

  assert.deepEqual(first, second);
  assert.deepEqual(grant, beforeGrant);
  assert.deepEqual(request, beforeRequest);
});
