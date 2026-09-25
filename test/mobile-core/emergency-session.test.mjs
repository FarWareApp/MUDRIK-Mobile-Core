import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const sessionModule = loadTypeScriptModule(
  'src/core/emergency/emergencySession.ts',
);
const registryModule = loadTypeScriptModule(
  'src/core/emergency/emergencySessionRegistry.ts',
);

const NOW = 100_000;
const ACCOUNT = 'acct_0123456789abcdef';
const OTHER_ACCOUNT = 'acct_fedcba9876543210';
const DEVICE = 'dev_0123456789abcdef';

function config(overrides = {}) {
  return {
    configId: 'egc_0123456789abcdef',
    accountId: ACCOUNT,
    revision: 4,
    enabled: true,
    mode: 'simulation',
    automaticEscalation: false,
    responsivenessTimeoutMs: 10_000,
    escalationCountdownMs: 15_000,
    evidenceSources: ['user_report', 'responsiveness'],    emergencyContactRefs: [],
    shareLocation: false,
    medicalProfileRef: null,
    shareMedicalProfile: false,
    updatedAtMs: 90_000,
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    emergencySessionId:
      'ems_0123456789abcdef',
    accountId: ACCOUNT,
    sourceDeviceId: DEVICE,
    config: config(),
    ...overrides,
  };
}

test(
  'simulation session is bound to account device config and trusted open time',
  () => {
    const opened =
      sessionModule.openEmergencySession(
        input(),
        NOW,
      );

    assert.equal(opened.accepted, true);
    assert.equal(opened.reason, 'accepted');
    assert.equal(opened.grantsAuthority, false);    assert.deepEqual(
      opened.session,
      {
        emergencySessionId:
          'ems_0123456789abcdef',
        accountId: ACCOUNT,
        sourceDeviceId: DEVICE,
        configId: 'egc_0123456789abcdef',
        configRevision: 4,
        mode: 'simulation',
        openedAtMs: NOW,
        simulationOnly: true,
        grantsAuthority: false,
      },
    );
  },
);

test(
  'live preference remains visible but still grants no authority',
  () => {
    const opened =
      sessionModule.openEmergencySession(
        input({
          config: config({
            mode: 'live',
          }),
        }),
        NOW,
      );

    assert.equal(opened.accepted, true);
    assert.equal(opened.session.mode, 'live');
    assert.equal(
      opened.session.simulationOnly,
      false,
    );    assert.equal(
      opened.session.grantsAuthority,
      false,
    );
  },
);

test(
  'disabled guardian cannot create an emergency session',
  () => {
    const opened =
      sessionModule.openEmergencySession(
        input({
          config: config({
            enabled: false,
          }),
        }),
        NOW,
      );

    assert.equal(opened.accepted, false);
    assert.equal(
      opened.reason,
      'guardian_disabled',
    );
    assert.equal(opened.session, null);
  },
);

test(
  'session cannot cross account binding',
  () => {
    const opened =
      sessionModule.openEmergencySession(
        input({
          accountId: OTHER_ACCOUNT,
        }),        NOW,
      );

    assert.equal(opened.accepted, false);
    assert.equal(
      opened.reason,
      'account_mismatch',
    );
    assert.equal(opened.session, null);
  },
);

test(
  'session open time comes only from trusted evaluation time',
  () => {
    assert.equal(
      sessionModule.openEmergencySession(
        {
          ...input(),
          openedAtMs: 1,
        },
        NOW,
      ).reason,
      'invalid_input',
    );

    assert.equal(
      sessionModule.openEmergencySession(
        input(),
        Number.NaN,
      ).reason,
      'invalid_input',
    );
  },
);

test(
  'hidden authority and action fields fail closed',
  () => {    for (const hostile of [
      {
        ...input(),
        grantsAuthority: true,
      },
      {
        ...input(),
        emergencyCall: true,
      },
      {
        ...input(),
        contactGrantId: 'grant-hidden',
      },
    ]) {
      const opened =
        sessionModule.openEmergencySession(
          hostile,
          NOW,
        );

      assert.equal(
        opened.reason,
        'invalid_input',
      );
      assert.equal(opened.session, null);
    }
  },
);

test(
  'malformed identities and config fail closed',
  () => {
    const invalid = [
      input({
        emergencySessionId: 'ems_bad',
      }),
      input({
        accountId: 'acct_bad',
      }),
      input({
        sourceDeviceId: 'dev_bad',
      }),      input({
        config: config({
          revision:
            Number.MAX_SAFE_INTEGER + 1,
        }),
      }),
      input({
        config: config({
          updatedAtMs: NOW + 1,
        }),
      }),
    ];

    for (const value of invalid) {
      const opened =
        sessionModule.openEmergencySession(
          value,
          NOW,
        );

      assert.equal(
        opened.reason,
        'invalid_input',
      );
      assert.equal(opened.session, null);
    }
  },
);
test(
  'session registry makes exact reopen idempotent and preserves original trusted open time',
  () => {
    const registry =
      new registryModule
        .EmergencySessionRegistry();

    const first =
      registry.open(
        input(),
        NOW,
      );
    const duplicate =
      registry.open(
        input(),
        NOW + 5_000,
      );

    assert.equal(first.reason, 'accepted');
    assert.equal(duplicate.reason, 'duplicate');
    assert.equal(
      duplicate.idempotent,
      true,
    );
    assert.equal(
      duplicate.session.openedAtMs,
      NOW,
    );    assert.equal(
      duplicate.grantsAuthority,
      false,
    );
  },
);

test(
  'session registry rejects identity config revision and mode substitution',
  () => {
    const cases = [
      input({
        sourceDeviceId:
          'dev_fedcba9876543210',
      }),
      input({
        config: config({
          revision: 5,
        }),
      }),
      input({
        config: config({
          mode: 'live',
        }),
      }),
    ];

    for (const conflicting of cases) {
      const registry =
        new registryModule
          .EmergencySessionRegistry();

      assert.equal(
        registry.open(
          input(),
          NOW,
        ).reason,
        'accepted',
      );      assert.equal(
        registry.open(
          conflicting,
          NOW + 1,
        ).reason,
        'session_conflict',
      );
    }
  },
);

test(
  'session registry retrieval and clear remain bounded to valid session ids',
  () => {
    const registry =
      new registryModule
        .EmergencySessionRegistry();

    registry.open(input(), NOW);

    assert.equal(
      registry.get(
        'ems_0123456789abcdef',
      ).accountId,
      ACCOUNT,
    );
    assert.equal(
      registry.get('invalid'),
      null,
    );

    registry.clearSession(
      'ems_0123456789abcdef',
    );

    assert.equal(
      registry.get(
        'ems_0123456789abcdef',
      ),
      null,
    );
  },
);
test(
  'retired session ids cannot be replayed after clear',
  () => {
    const registry =
      new registryModule
        .EmergencySessionRegistry();

    assert.equal(
      registry.open(input(), NOW).reason,
      'accepted',
    );

    registry.clearSession(
      'ems_0123456789abcdef',
    );

    const replay =
      registry.open(
        input(),
        NOW + 10_000,
      );

    assert.equal(
      replay.accepted,
      false,
    );
    assert.equal(
      replay.reason,
      'session_replay',
    );
    assert.equal(replay.session, null);
  },
);