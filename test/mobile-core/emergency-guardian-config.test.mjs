import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const configModule =
  loadTypeScriptModule(
    'src/core/emergency/emergencyGuardianConfig.ts',
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
    automaticEscalation: true,
    responsivenessTimeoutMs: 10_000,
    escalationCountdownMs: 15_000,
    evidenceSources: [
      'user_report',
      'motion',
      'heart_rate',
    ],
    emergencyContactRefs: [
      'emc_0123456789abcdef',
    ],
    shareLocation: true,
    medicalProfileRef:
      'emp_0123456789abcdef',
    shareMedicalProfile: true,
    updatedAtMs: 90_000,
    ...overrides,
  };
}

test(
  'simulation config parses without granting authority',
  () => {
    const parsed =
      configModule
        .parseEmergencyGuardianConfig(
          config(),
          NOW,
        );

    assert.ok(parsed);
    assert.equal(
      parsed.simulationOnly,
      true,
    );
    assert.equal(
      parsed.grantsAuthority,
      false,
    );
    assert.deepEqual(
      parsed.evidenceSources,
      [
        'user_report',
        'motion',
        'heart_rate',
      ],
    );
  },
);

test(
  'live preference remains configuration only and grants no authority',
  () => {
    const parsed =
      configModule
        .parseEmergencyGuardianConfig(
          config({
            mode: 'live',
          }),
          NOW,
        );

    assert.ok(parsed);
    assert.equal(
      parsed.simulationOnly,
      false,
    );
    assert.equal(
      parsed.grantsAuthority,
      false,
    );
  },
);

test(
  'unknown hidden authority and raw profile fields fail closed',
  () => {
    const cases = [
      {
        ...config(),
        permissions: ['all'],
      },
      {
        ...config(),
        simulationOnly: false,
      },
      {
        ...config(),
        medicalProfile: {
          diagnosis: 'hidden',
        },
      },
    ];

    for (const value of cases) {
      assert.equal(
        configModule
          .parseEmergencyGuardianConfig(
            value,
            NOW,
          ),
        null,
      );
    }
  },
);

test(
  'identities revision timestamps and integer bounds are strict',
  () => {
    const cases = [
      config({
        configId: 'bad',
      }),
      config({
        accountId: 'dev_0123456789abcdef',
      }),
      config({
        revision: -1,
      }),
      config({
        revision:
          Number.MAX_SAFE_INTEGER + 1,
      }),
      config({
        updatedAtMs: NOW + 1,
      }),
      config({
        updatedAtMs: Number.NaN,
      }),
      config({
        responsivenessTimeoutMs: 2_999,
      }),
      config({
        responsivenessTimeoutMs: 60_001,
      }),
      config({
        escalationCountdownMs: 2_999,
      }),
      config({
        escalationCountdownMs: 120_001,
      }),
    ];

    for (const value of cases) {
      assert.equal(
        configModule
          .parseEmergencyGuardianConfig(
            value,
            NOW,
          ),
        null,
      );
    }
  },
);

test(
  'evidence sources are bounded unique and known',
  () => {
    const cases = [
      config({
        evidenceSources: [
          'motion',
          'motion',
        ],
      }),
      config({
        evidenceSources: [
          'diagnosis_model',
        ],
      }),
      config({
        evidenceSources:
          new Array(10).fill(
            'user_report',
          ),
      }),
    ];

    for (const value of cases) {
      assert.equal(
        configModule
          .parseEmergencyGuardianConfig(
            value,
            NOW,
          ),
        null,
      );
    }
  },
);

test(
  'contact and medical references are opaque bounded references only',
  () => {
    const cases = [
      config({
        emergencyContactRefs: [
          'emc_0123456789abcdef',
          'emc_0123456789abcdef',
        ],
      }),
      config({
        emergencyContactRefs: [
          '+491234567890',
        ],
      }),
      config({
        medicalProfileRef:
          'medical-record-inline',
      }),
      config({
        medicalProfileRef: null,
        shareMedicalProfile: true,
      }),
    ];

    for (const value of cases) {
      assert.equal(
        configModule
          .parseEmergencyGuardianConfig(
            value,
            NOW,
          ),
        null,
      );
    }
  },
);

test(
  'disabled guardian may keep preferences but still grants no authority',
  () => {
    const parsed =
      configModule
        .parseEmergencyGuardianConfig(
          config({
            enabled: false,
            evidenceSources: [],
            emergencyContactRefs: [],
            medicalProfileRef: null,
            shareMedicalProfile: false,
          }),
          NOW,
        );

    assert.ok(parsed);
    assert.equal(
      parsed.enabled,
      false,
    );
    assert.equal(
      parsed.grantsAuthority,
      false,
    );
  },
);
