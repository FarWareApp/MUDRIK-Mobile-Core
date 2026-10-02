import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  CredentialBroker,
} = loadTypeScriptModule(
  'src/core/security/credentialBroker.ts',
);

const NOW = 5_000_000_000;
const SUBJECT =
  'subject_intelligence_111111111111';
const CREDENTIAL =
  'credential_ref_1111111111111111';
const OPERATION =
  'operation_ref_provider_111111111111';
const DOMAIN = 'api.example.com';

function request(overrides = {}) {
  return {
    leaseId:
      'credential_lease_1111111111111111',
    subjectId: SUBJECT,
    credentialRef: CREDENTIAL,
    operationRef: OPERATION,
    domain: DOMAIN,
    background: false,
    requestedTtlMs: 60_000,
    maxUses: 2,
    ...overrides,
  };
}

function secretGrant(overrides = {}) {
  return {
    grantId:
      'grant_secret_1111111111111111',
    subjectId: SUBJECT,
    capability: 'secret.use',
    scope: {
      resourceId: CREDENTIAL,
    },
    expiresAtMs: NOW + 120_000,
    ...overrides,
  };
}

function networkGrant(overrides = {}) {
  return {
    grantId:
      'grant_network_1111111111111111',
    subjectId: SUBJECT,
    capability: 'network.request',
    scope: {
      allowedDomains: [DOMAIN],
    },
    expiresAtMs: NOW + 90_000,
    ...overrides,
  };
}

function grants() {
  return [
    secretGrant(),
    networkGrant(),
  ];
}

test('broker issues short scoped lease without exposing secret material', () => {
  const broker = new CredentialBroker();

  const issued =
    broker.issue(
      request(),
      grants(),
      true,
      NOW,
    );

  assert.equal(issued.accepted, true);
  assert.equal(issued.reason, 'issued');
  assert.equal(
    issued.lease?.credentialRef,
    CREDENTIAL,
  );
  assert.equal(
    issued.lease?.expiresAtMs,
    NOW + 60_000,
  );
  assert.equal(
    issued.credentialRef,
    null,
  );

  assert.equal(
    JSON.stringify(issued).includes(
      'password',
    ),
    false,
  );
});

test('secret grant must be explicitly scoped to exact credential reference', () => {
  const broker = new CredentialBroker();

  const broad =
    broker.issue(
      request(),
      [
        secretGrant({ scope: {} }),
        networkGrant(),
      ],
      true,
      NOW,
    );

  assert.equal(broad.accepted, false);
  assert.equal(
    broad.reason,
    'secret_scope_too_broad',
  );

  const wrong =
    broker.issue(
      request(),
      [
        secretGrant({
          scope: {
            resourceId:
              'credential_ref_2222222222222222',
          },
        }),
        networkGrant(),
      ],
      true,
      NOW,
    );

  assert.equal(wrong.accepted, false);
  assert.equal(
    wrong.reason,
    'secret_capability_denied',
  );
});

test('online credential use also requires exact network authorization', () => {
  const broker = new CredentialBroker();

  const denied =
    broker.issue(
      request(),
      [
        secretGrant(),
        networkGrant({
          scope: {
            allowedDomains: [
              'other.example.com',
            ],
          },
        }),
      ],
      true,
      NOW,
    );

  assert.equal(denied.accepted, false);
  assert.equal(
    denied.reason,
    'network_capability_denied',
  );
});

test('consume is bound to subject operation domain and use count', () => {
  const broker = new CredentialBroker();

  const issued =
    broker.issue(
      request(),
      grants(),
      true,
      NOW,
    );

  assert.ok(issued.lease);

  assert.equal(
    broker.consume(
      issued.lease.leaseId,
      SUBJECT,
      OPERATION,
      DOMAIN,
      grants(),
      true,
      NOW + 100,
    ).accepted,
    true,
  );

  assert.equal(
    broker.consume(
      issued.lease.leaseId,
      SUBJECT,
      OPERATION,
      DOMAIN,
      grants(),
      true,
      NOW + 200,
    ).accepted,
    true,
  );

  const exhausted =
    broker.consume(
      issued.lease.leaseId,
      SUBJECT,
      OPERATION,
      DOMAIN,
      grants(),
      true,
      NOW + 300,
    );

  assert.equal(
    exhausted.accepted,
    false,
  );
  assert.equal(
    exhausted.reason,
    'lease_exhausted',
  );

  const mismatch =
    broker.consume(
      issued.lease.leaseId,
      SUBJECT,
      'operation_ref_other_2222222222222',
      DOMAIN,
      grants(),
      true,
      NOW + 300,
    );

  assert.equal(
    mismatch.reason,
    'binding_mismatch',
  );
});

test('capability is revalidated at consume time so revocation takes effect immediately', () => {
  const broker = new CredentialBroker();

  const issued =
    broker.issue(
      request(),
      grants(),
      true,
      NOW,
    );

  assert.ok(issued.lease);

  const revokedGrants = [
    secretGrant({
      revokedAtMs: NOW + 10,
    }),
    networkGrant(),
  ];

  const consumed =
    broker.consume(
      issued.lease.leaseId,
      SUBJECT,
      OPERATION,
      DOMAIN,
      revokedGrants,
      true,
      NOW + 20,
    );

  assert.equal(
    consumed.accepted,
    false,
  );
  assert.equal(
    consumed.reason,
    'secret_capability_denied',
  );
});

test('network grant revocation and runtime compromise both stop credential use', () => {
  const broker = new CredentialBroker();

  const issued =
    broker.issue(
      request(),
      grants(),
      true,
      NOW,
    );

  assert.ok(issued.lease);

  const revokedNetwork = [
    secretGrant(),
    networkGrant({
      revokedAtMs: NOW + 10,
    }),
  ];

  assert.equal(
    broker.consume(
      issued.lease.leaseId,
      SUBJECT,
      OPERATION,
      DOMAIN,
      revokedNetwork,
      true,
      NOW + 20,
    ).reason,
    'network_capability_denied',
  );

  assert.equal(
    broker.consume(
      issued.lease.leaseId,
      SUBJECT,
      OPERATION,
      DOMAIN,
      grants(),
      false,
      NOW + 20,
    ).reason,
    'runtime_untrusted',
  );
});

test('lease lifetime is clamped to shortest capability expiry', () => {
  const broker = new CredentialBroker();

  const issued =
    broker.issue(
      request({
        requestedTtlMs: 120_000,
      }),
      [
        secretGrant({
          expiresAtMs: NOW + 80_000,
        }),
        networkGrant({
          expiresAtMs: NOW + 30_000,
        }),
      ],
      true,
      NOW,
    );

  assert.equal(issued.accepted, true);
  assert.equal(
    issued.lease?.expiresAtMs,
    NOW + 30_000,
  );

  assert.equal(
    broker.consume(
      issued.lease.leaseId,
      SUBJECT,
      OPERATION,
      DOMAIN,
      [
        secretGrant({
          expiresAtMs: NOW + 80_000,
        }),
        networkGrant({
          expiresAtMs: NOW + 30_000,
        }),
      ],
      true,
      NOW + 30_000,
    ).reason,
    'lease_expired',
  );
});

test('explicit broker revocation is idempotent and permanent', () => {
  const broker = new CredentialBroker();

  const issued =
    broker.issue(
      request(),
      grants(),
      true,
      NOW,
    );

  assert.ok(issued.lease);

  assert.equal(
    broker.revoke(
      issued.lease.leaseId,
      NOW + 10,
    ).reason,
    'revoked',
  );

  assert.equal(
    broker.revoke(
      issued.lease.leaseId,
      NOW + 20,
    ).reason,
    'revoked',
  );

  assert.equal(
    broker.consume(
      issued.lease.leaseId,
      SUBJECT,
      OPERATION,
      DOMAIN,
      grants(),
      true,
      NOW + 30,
    ).reason,
    'lease_revoked',
  );
});

test('offline credential lease can omit network permission entirely', () => {
  const broker = new CredentialBroker();

  const offlineRequest =
    request({ domain: null });

  const issued =
    broker.issue(
      offlineRequest,
      [secretGrant()],
      true,
      NOW,
    );

  assert.equal(issued.accepted, true);
  assert.equal(
    issued.lease?.networkGrantId,
    null,
  );

  assert.equal(
    broker.consume(
      issued.lease.leaseId,
      SUBJECT,
      OPERATION,
      null,
      [secretGrant()],
      true,
      NOW + 100,
    ).accepted,
    true,
  );
});
