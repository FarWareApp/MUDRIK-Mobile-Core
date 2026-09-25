import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const registryModule =
  loadTypeScriptModule(
    'src/core/emergency/emergencyGuardianConfigRegistry.ts',
  );

const NOW = 100_000;

function config(overrides = {}) {
  return {
    configId:
      'egc_0123456789abcdef',
    accountId:
      'acct_0123456789abcdef',
    revision: 0,
    enabled: true,
    mode: 'simulation',
    automaticEscalation: false,
    responsivenessTimeoutMs: 10_000,
    escalationCountdownMs: 15_000,
    evidenceSources: [
      'user_report',
      'motion',
    ],
    emergencyContactRefs: [
      'emc_0123456789abcdef',
    ],
    shareLocation: false,
    medicalProfileRef: null,
    shareMedicalProfile: false,
    updatedAtMs: 90_000,
    ...overrides,
  };
}

test(
  'registry requires revision zero for first configuration',
  () => {
    const registry =
      new registryModule
        .EmergencyGuardianConfigRegistry();

    assert.equal(
      registry.apply(
        config({ revision: 1 }),
        NOW,
      ).reason,
      'revision_gap',
    );

    assert.equal(
      registry.apply(
        config(),
        NOW,
      ).reason,
      'accepted',
    );
  },
);

test(
  'exact duplicate is idempotent but same revision conflict fails closed',
  () => {
    const registry =
      new registryModule
        .EmergencyGuardianConfigRegistry();

    registry.apply(config(), NOW);

    const duplicate =
      registry.apply(config(), NOW);
    assert.equal(
      duplicate.reason,
      'duplicate',
    );
    assert.equal(
      duplicate.idempotent,
      true,
    );

    assert.equal(
      registry.apply(
        config({
          enabled: false,
        }),
        NOW,
      ).reason,
      'revision_conflict',
    );
  },
);

test(
  'registry rejects stale and skipped revisions',
  () => {
    const registry =
      new registryModule
        .EmergencyGuardianConfigRegistry();

    registry.apply(config(), NOW);

    assert.equal(
      registry.apply(
        config({
          revision: 2,
          updatedAtMs: 92_000,
        }),
        NOW,
      ).reason,
      'revision_gap',
    );

    assert.equal(
      registry.apply(
        config({
          revision: 1,
          updatedAtMs: 91_000,
        }),
        NOW,
      ).reason,
      'accepted',
    );

    assert.equal(
      registry.apply(
        config({
          revision: 0,
        }),
        NOW,
      ).reason,
      'stale_revision',
    );
  },
);

test(
  'configuration identity cannot migrate between accounts',
  () => {
    const registry =
      new registryModule
        .EmergencyGuardianConfigRegistry();

    registry.apply(config(), NOW);

    assert.equal(
      registry.apply(
        config({
          accountId:
            'acct_fedcba9876543210',
          revision: 1,
          updatedAtMs: 91_000,
        }),
        NOW,
      ).reason,
      'account_binding_mismatch',
    );
  },
);

test(
  'update timestamps cannot roll backward',
  () => {
    const registry =
      new registryModule
        .EmergencyGuardianConfigRegistry();

    registry.apply(config(), NOW);

    assert.equal(
      registry.apply(
        config({
          revision: 1,
          updatedAtMs: 89_999,
        }),
        NOW,
      ).reason,
      'non_monotonic_update_time',
    );
  },
);

test(
  'accepted updates remain authority free and retrievable',
  () => {
    const registry =
      new registryModule
        .EmergencyGuardianConfigRegistry();

    registry.apply(config(), NOW);

    const update =
      registry.apply(
        config({
          revision: 1,
          mode: 'live',
          updatedAtMs: 91_000,
        }),
        NOW,
      );

    assert.equal(
      update.reason,
      'accepted',
    );

    const stored =
      registry.get(
        'egc_0123456789abcdef',
      );

    assert.ok(stored);
    assert.equal(stored.mode, 'live');
    assert.equal(
      stored.grantsAuthority,
      false,
    );
  },
);
