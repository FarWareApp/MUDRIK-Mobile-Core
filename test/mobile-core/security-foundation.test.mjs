import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  isCapabilityId,
} = loadTypeScriptModule(
  'src/core/security/capabilities.ts',
);

const {
  authorizeCapability,
} = loadTypeScriptModule(
  'src/core/security/capabilityPolicy.ts',
);

const {
  createSecurityEvent,
  sanitizeSecurityMetadata,
} = loadTypeScriptModule(
  'src/core/security/securityEvent.ts',
);

const {
  assertSecretReference,
  isSecretReference,
} = loadTypeScriptModule(
  'src/core/security/secretReference.ts',
);

const NOW = 2_000_000;

function grant(overrides = {}) {
  return {
    grantId: 'grant-1',
    subjectId: 'device-a',
    capability: 'media.control',
    ...overrides,
  };
}

function request(overrides = {}) {
  return {
    subjectId: 'device-a',
    capability: 'media.control',
    nowMs: NOW,
    ...overrides,
  };
}

test('capability registry accepts canonical ids and rejects invented authority', () => {
  assert.equal(isCapabilityId('camera.observe'), true);
  assert.equal(isCapabilityId('terminal.execute'), true);
  assert.equal(isCapabilityId('root.everything'), false);
  assert.equal(isCapabilityId('filesystem.*'), false);
});

test('capability policy is default deny', () => {
  assert.deepEqual(
    authorizeCapability(request(), []),
    {
      allowed: false,
      reason: 'no_matching_grant',
    },
  );
});

test('unknown capabilities cannot be authorized even if input is crafted', () => {
  assert.deepEqual(
    authorizeCapability(
      request({ capability: 'security.disable_everything' }),
      [grant()],
    ),
    {
      allowed: false,
      reason: 'unknown_capability',
    },
  );
});

test('subject identity must match the grant exactly', () => {
  assert.deepEqual(
    authorizeCapability(
      request({ subjectId: 'device-b' }),
      [grant()],
    ),
    {
      allowed: false,
      reason: 'no_matching_grant',
    },
  );
});

test('revoked and expired grants fail closed', () => {
  assert.equal(
    authorizeCapability(
      request(),
      [grant({ revokedAtMs: NOW - 1 })],
    ).reason,
    'grant_revoked',
  );

  assert.equal(
    authorizeCapability(
      request(),
      [grant({ expiresAtMs: NOW })],
    ).reason,
    'grant_expired',
  );
});

test('a later valid grant can authorize even when an earlier candidate is expired', () => {
  const decision = authorizeCapability(
    request(),
    [
      grant({ grantId: 'expired', expiresAtMs: NOW - 1 }),
      grant({ grantId: 'valid', expiresAtMs: NOW + 10_000 }),
    ],
  );

  assert.deepEqual(decision, {
    allowed: true,
    reason: 'allowed',
    grantId: 'valid',
  });
});

test('filesystem git and terminal capabilities require a non-root workspace prefix', () => {
  for (const capability of [
    'filesystem.read',
    'filesystem.write',
    'git.read',
    'git.write',
    'terminal.execute',
  ]) {
    assert.equal(
      authorizeCapability(
        request({ capability, resourcePath: '/workspace/project-a/file.txt' }),
        [grant({ capability })],
      ).reason,
      'grant_scope_required',
    );

    assert.equal(
      authorizeCapability(
        request({ capability, resourcePath: '/workspace/project-a/file.txt' }),
        [grant({ capability, scope: { resourcePrefix: '/' } })],
      ).reason,
      'grant_scope_required',
    );

    assert.equal(
      authorizeCapability(
        request({ capability, resourcePath: '/workspace/project-a/file.txt' }),
        [
          grant({
            capability,
            scope: { resourcePrefix: '/workspace/project-a' },
          }),
        ],
      ).allowed,
      true,
    );
  }
});

test('network access requires an explicit exact-host allowlist', () => {
  assert.equal(
    authorizeCapability(
      request({ capability: 'network.request', domain: 'api.example.com' }),
      [grant({ capability: 'network.request' })],
    ).reason,
    'grant_scope_required',
  );

  assert.equal(
    authorizeCapability(
      request({ capability: 'network.request', domain: 'api.example.com' }),
      [
        grant({
          capability: 'network.request',
          scope: { allowedDomains: ['api.example.com'] },
        }),
      ],
    ).allowed,
    true,
  );
});

test('malformed grants fail closed instead of throwing or widening authority', () => {
  assert.equal(
    authorizeCapability(
      request(),
      [{ ...grant(), grantId: '' }],
    ).reason,
    'grant_invalid',
  );

  assert.equal(
    authorizeCapability(
      request(),
      [{ ...grant(), scope: { unexpectedAuthority: true } }],
    ).reason,
    'grant_invalid',
  );
});

test('resource ids are exact and cannot cross scope', () => {
  const scopedGrant = grant({
    scope: {
      resourceId: 'project-a',
    },
  });

  assert.equal(
    authorizeCapability(
      request({ resourceId: 'project-a' }),
      [scopedGrant],
    ).allowed,
    true,
  );

  assert.equal(
    authorizeCapability(
      request({ resourceId: 'project-b' }),
      [scopedGrant],
    ).reason,
    'resource_mismatch',
  );
});

test('resource prefixes reject traversal, encoded paths and ambiguous separators', () => {
  const scopedGrant = grant({
    scope: {
      resourcePrefix: '/workspace/project-a',
    },
  });

  assert.equal(
    authorizeCapability(
      request({ resourcePath: '/workspace/project-a/src/index.ts' }),
      [scopedGrant],
    ).allowed,
    true,
  );

  for (const unsafePath of [
    '/workspace/project-a/../project-b/secret.txt',
    '/workspace/project-a/%2e%2e/project-b/secret.txt',
    '/workspace/project-a\\..\\project-b\\secret.txt',
    '/workspace/project-a//nested/file.txt',
  ]) {
    assert.equal(
      authorizeCapability(
        request({ resourcePath: unsafePath }),
        [scopedGrant],
      ).reason,
      'resource_mismatch',
    );
  }
});

test('domain scopes are exact by default and reject implicit subdomains or lookalikes', () => {
  const networkGrant = grant({
    capability: 'network.request',
    scope: {
      allowedDomains: ['example.com'],
    },
  });

  assert.equal(
    authorizeCapability(
      request({ capability: 'network.request', domain: 'example.com' }),
      [networkGrant],
    ).allowed,
    true,
  );

  for (const deniedDomain of [
    'api.example.com',
    'example.com.evil.test',
    'evil-example.com',
  ]) {
    assert.equal(
      authorizeCapability(
        request({ capability: 'network.request', domain: deniedDomain }),
        [networkGrant],
      ).reason,
      'domain_mismatch',
    );
  }
});

test('background execution and privilege elevation require explicit scope', () => {
  const scopedGrant = grant({
    scope: {
      allowBackground: false,
      maxElevation: 'user',
    },
  });

  assert.equal(
    authorizeCapability(
      request({ background: true }),
      [scopedGrant],
    ).reason,
    'background_not_allowed',
  );

  assert.equal(
    authorizeCapability(
      request({ elevation: 'admin' }),
      [scopedGrant],
    ).reason,
    'elevation_not_allowed',
  );

  assert.equal(
    authorizeCapability(
      request({ elevation: 'user' }),
      [scopedGrant],
    ).allowed,
    true,
  );
});

test('invalid request identity and timestamp fail closed', () => {
  assert.equal(
    authorizeCapability(
      request({ subjectId: '   ' }),
      [grant()],
    ).reason,
    'invalid_request',
  );

  assert.equal(
    authorizeCapability(
      request({ nowMs: Number.NaN }),
      [grant()],
    ).reason,
    'invalid_request',
  );
});

test('security metadata redacts sensitive keys and common credential shapes', () => {
  const syntheticApiKey = ['s', 'k-', '1234567890abcdefghijklmnop'].join('');
  const sanitized = sanitizeSecurityMetadata({
    reason: 'denied',
    authorization: 'Bearer abc.def.ghi',
    password: 'do-not-log-me',
    note: `token here: ${syntheticApiKey}`,
    jwt: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnopqrstuvwxyz',
    nested: { private: 'content' },
  });

  assert.equal(sanitized.reason, 'denied');
  assert.equal(sanitized.authorization, '[REDACTED]');
  assert.equal(sanitized.password, '[REDACTED]');
  assert.match(sanitized.note, /\[REDACTED_SECRET\]/);
  assert.equal(sanitized.jwt, '[REDACTED]');
  assert.equal(sanitized.nested, '[REDACTED_NON_SCALAR]');
});

test('security event creation rejects invalid identity and preserves sanitized metadata only', () => {
  assert.throws(
    () => createSecurityEvent({
      eventId: '',
      type: 'authorization.denied',
      severity: 'warning',
      occurredAtMs: NOW,
    }),
  );

  const event = createSecurityEvent({
    eventId: 'evt-1',
    type: 'authorization.denied',
    severity: 'warning',
    occurredAtMs: NOW,
    metadata: {
      capability: 'filesystem.write',
      apiKey: 'top-secret',
    },
  });

  assert.equal(event.metadata.capability, 'filesystem.write');
  assert.equal(event.metadata.apiKey, '[REDACTED]');
  assert.equal(Object.isFrozen(event), true);
  assert.equal(Object.isFrozen(event.metadata), true);
});

test('secret handling accepts scoped references and rejects plaintext material', () => {
  const syntheticPlaintext = ['s', 'k-', 'plaintext-secret-value'].join('');

  assert.equal(isSecretReference('secret://openai/primary-api-key'), true);
  assert.equal(isSecretReference(syntheticPlaintext), false);
  assert.equal(isSecretReference('secret://OpenAI/key'), false);
  assert.equal(isSecretReference('secret://openai/../key'), false);

  assert.equal(
    assertSecretReference('secret://github/release-token'),
    'secret://github/release-token',
  );

  assert.throws(
    () => assertSecretReference('actual-secret-value'),
  );
});
