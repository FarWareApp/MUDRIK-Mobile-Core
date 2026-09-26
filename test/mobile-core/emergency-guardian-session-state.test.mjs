import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const registryModule = loadTypeScriptModule(
  'src/core/emergency/emergencySessionRegistry.ts',
);
const stateModule = loadTypeScriptModule(
  'src/core/emergency/emergencyGuardianSessionState.ts',
);

const NOW = 100_000;
const ACCOUNT = 'acct_0123456789abcdef';
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
    evidenceSources: [
      'user_report',
      'responsiveness',
    ],
    emergencyContactRefs: [],
    shareLocation: false,
    medicalProfileRef: null,
    shareMedicalProfile: false,
    updatedAtMs: 90_000,
    ...overrides,
  };
}

function openInput(overrides = {}) {
  return {
    emergencySessionId:
      'ems_0123456789abcdef',
    accountId: ACCOUNT,
    sourceDeviceId: DEVICE,
    config: config(),
    ...overrides,
  };
}

function registeredSession() {
  const registry =
    new registryModule
      .EmergencySessionRegistry();
  const opened =
    registry.open(
      openInput(),
      NOW,
    );

  assert.equal(opened.accepted, true);

  return {
    registry,
    session: opened.session,
  };
}

test(
  'guardian session state requires registry-issued session provenance',
  () => {
    const {
      session,
    } = registeredSession();

    const created =
      stateModule
        .createEmergencyGuardianSessionState(
          session,
          NOW,
        );

    assert.equal(created.accepted, true);
    assert.equal(created.reason, 'accepted');
    assert.equal(
      created.state.state.phase,
      'normal',
    );
    assert.equal(
      created.state.state.generation,
      0,
    );
    assert.equal(
      created.state.grantsAuthority,
      false,
    );
    assert.equal(
      created.performsExternalAction,
      false,
    );
  },
);

test(
  'raw session snapshot cannot manufacture guardian state',
  () => {
    const {
      session,
    } = registeredSession();
    const forged = {
      ...session,
    };

    assert.equal(
      stateModule
        .createEmergencyGuardianSessionState(
          forged,
          NOW,
        ).reason,
      'invalid_input',
    );
  },
);

test(
  'retiring a session invalidates its state-creation provenance',
  () => {
    const {
      registry,
      session,
    } = registeredSession();

    registry.clearSession(
      session.emergencySessionId,
    );

    assert.equal(
      registryModule
        .isRegisteredEmergencySession(
          session,
        ),
      false,
    );
    assert.equal(
      stateModule
        .createEmergencyGuardianSessionState(
          session,
          NOW,
        ).reason,
      'invalid_input',
    );
  },
);

test(
  'guardian session transitions reject copied or forged state objects',
  () => {
    const {
      session,
    } = registeredSession();
    const created =
      stateModule
        .createEmergencyGuardianSessionState(
          session,
          NOW,
        );

    const forged = {
      ...created.state,
    };

    assert.equal(
      stateModule
        .transitionEmergencyGuardianSessionState(
          {
            sessionState: forged,
            event: 'request_check',
          },
          NOW,
        ).reason,
      'untrusted_state',
    );
  },
);

test(
  'issued transitions preserve session binding and generation semantics',
  () => {
    const {
      session,
    } = registeredSession();
    const created =
      stateModule
        .createEmergencyGuardianSessionState(
          session,
          NOW,
        );

    const checking =
      stateModule
        .transitionEmergencyGuardianSessionState(
          {
            sessionState: created.state,
            event: 'request_check',
          },
          NOW + 1,
        );

    assert.equal(checking.accepted, true);
    assert.equal(
      checking.next.session,
      session,
    );
    assert.equal(
      checking.next.state.phase,
      'check_user',
    );
    assert.equal(
      checking.next.state.generation,
      0,
    );

    const resolved =
      stateModule
        .transitionEmergencyGuardianSessionState(
          {
            sessionState: checking.next,
            event: 'user_ok',
          },
          NOW + 2,
        );
    const reset =
      stateModule
        .transitionEmergencyGuardianSessionState(
          {
            sessionState: resolved.next,
            event: 'reset',
          },
          NOW + 3,
        );

    assert.equal(reset.accepted, true);
    assert.equal(
      reset.next.state.phase,
      'normal',
    );
    assert.equal(
      reset.next.state.generation,
      1,
    );
    assert.equal(
      reset.grantsAuthority,
      false,
    );
    assert.equal(
      reset.performsExternalAction,
      false,
    );
  },
);
