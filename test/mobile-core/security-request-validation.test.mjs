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

const validGrant = {
  grantId: 'grant-1',
  subjectId: 'device-a',
  capability: 'media.control',
};

const validRequest = {
  subjectId: 'device-a',
  capability: 'media.control',
  nowMs: 1000,
};

test('non-object and structurally malformed requests fail closed without throwing', () => {
  for (const request of [
    null,
    undefined,
    42,
    'request',
    [],
    {},
    { ...validRequest, subjectId: 123 },
    { ...validRequest, capability: 123 },
    { ...validRequest, nowMs: '1000' },
    { ...validRequest, nowMs: Infinity },
    { ...validRequest, unexpectedAuthority: true },
  ]) {
    assert.doesNotThrow(() => authorizeCapability(request, [validGrant]));
    assert.deepEqual(
      authorizeCapability(request, [validGrant]),
      { allowed: false, reason: 'invalid_request' },
    );
  }
});

test('request scope fields are runtime validated', () => {
  for (const request of [
    { ...validRequest, resourceId: 123 },
    { ...validRequest, resourcePath: 123 },
    { ...validRequest, domain: 123 },
    { ...validRequest, background: 'true' },
    { ...validRequest, elevation: 'root' },
    { ...validRequest, domain: 'example.com:443' },
    { ...validRequest, domain: 'user@example.com' },
    { ...validRequest, domain: 'https://example.com' },
  ]) {
    assert.deepEqual(
      authorizeCapability(request, [validGrant]),
      { allowed: false, reason: 'invalid_request' },
    );
  }
});

test('malformed grant payloads fail closed without throwing', () => {
  const malformedGrants = [
    null,
    undefined,
    [],
    'grant',
    { ...validGrant, grantId: 123 },
    { ...validGrant, subjectId: 123 },
    { ...validGrant, capability: 'made.up' },
    { ...validGrant, expiresAtMs: 'later' },
    { ...validGrant, revokedAtMs: Number.NaN },
    { ...validGrant, unexpectedAuthority: true },
    { ...validGrant, scope: [] },
    { ...validGrant, scope: { maxElevation: { toString: () => 'admin' } } },
  ];

  for (const malformed of malformedGrants) {
    assert.doesNotThrow(() => authorizeCapability(validRequest, [malformed]));
  }

  assert.deepEqual(
    authorizeCapability(validRequest, [{ ...validGrant, grantId: 123 }]),
    { allowed: false, reason: 'grant_invalid' },
  );
});

test('matching domain comparison is case-insensitive and trailing-dot equivalent only', () => {
  const networkGrant = {
    grantId: 'network-1',
    subjectId: 'device-a',
    capability: 'network.request',
    scope: {
      allowedDomains: ['api.example.com'],
    },
  };

  assert.equal(
    authorizeCapability(
      {
        subjectId: 'device-a',
        capability: 'network.request',
        nowMs: 1000,
        domain: 'API.Example.COM.',
      },
      [networkGrant],
    ).allowed,
    true,
  );

  assert.equal(
    authorizeCapability(
      {
        subjectId: 'device-a',
        capability: 'network.request',
        nowMs: 1000,
        domain: 'sub.api.example.com',
      },
      [networkGrant],
    ).reason,
    'domain_mismatch',
  );
});
