import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const eventModule = loadTypeScriptModule(
  'src/core/emergency/emergencyEvent.ts',
);
const registryModule = loadTypeScriptModule(
  'src/core/emergency/emergencyEventRegistry.ts',
);
const sessionStateModule = loadTypeScriptModule(
  'src/core/emergency/emergencyGuardianSessionState.ts',
);
const sessionRegistryModule = loadTypeScriptModule(
  'src/core/emergency/emergencySessionRegistry.ts',
);

const NOW = 100_000;
const ACCOUNT = 'acct_0123456789abcdef';
const OTHER_ACCOUNT = 'acct_fedcba9876543210';
const DEVICE = 'dev_0123456789abcdef';
const OTHER_DEVICE = 'dev_fedcba9876543210';
const KEY = 'dkey_0123456789abcdef';
const THUMB = 'A'.repeat(43);

function event(overrides = {}) {
  return {
    emergencySessionId: 'ems_0123456789abcdef',
    eventId: 'emev_0123456789abcdef',
    sequence: 0,
    accountId: ACCOUNT,
    sourceDeviceId: DEVICE,

    generation: 0,
    kind: 'user_ok',
    ...overrides,
  };
}

function trust(overrides = {}) {
  return {
    device: {
      deviceId: DEVICE,
      accountId: ACCOUNT,
      deviceKeyId: KEY,
      publicKeyThumbprint: THUMB,
      state: 'active',
      hardwareBacked: true,
    },
    expectedAccountId: ACCOUNT,
    expectedDeviceId: DEVICE,
    expectedDeviceKeyId: KEY,
    expectedPublicKeyThumbprint: THUMB,
    ...overrides,
  };
}

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

function registeredSession({
  sessionOverrides = {},
  configOverrides = {},
  openedAtMs = NOW,
} = {}) {
  const registry =
    new sessionRegistryModule
      .EmergencySessionRegistry();
  const opened =
    registry.open(
      {
        emergencySessionId:
          'ems_0123456789abcdef',
        accountId: ACCOUNT,
        sourceDeviceId: DEVICE,
        config: config(configOverrides),
        ...sessionOverrides,
      },
      openedAtMs,
    );

  assert.equal(opened.accepted, true);
  return opened.session;
}

function issueSessionState({
  sessionOverrides = {},
  generation = 0,
  startedAtMs = NOW,
} = {}) {
  const created =
    sessionStateModule
      .createEmergencyGuardianSessionState(
        registeredSession({
          sessionOverrides,
          openedAtMs: startedAtMs,
        }),
        startedAtMs,
      );

  assert.equal(created.accepted, true);

  let current = created.state;
  let time = startedAtMs;

  for (
    let index = 0;
    index < generation;
    index += 1
  ) {
    const resolved =
      sessionStateModule
        .transitionEmergencyGuardianSessionState(
          {
            sessionState: current,
            event: 'user_ok',
          },
          time,
        );
    assert.equal(resolved.accepted, true);

    time += 1;

    const reset =
      sessionStateModule
        .transitionEmergencyGuardianSessionState(
          {
            sessionState: resolved.next,
            event: 'reset',
          },
          time,
        );
    assert.equal(reset.accepted, true);
    current = reset.next;
  }

  return current;
}

function input(overrides = {}) {
  return {
    sessionState: issueSessionState(),
    sourceDeviceTrustInput: trust(),
    event: event(),
    ...overrides,
  };
}

test(
  'user event contract is strict bounded and authority free',
  () => {
    const parsed =
      eventModule.parseEmergencyUserEvent(
        event(),
      );

    assert.ok(parsed);
    assert.equal(parsed.kind, 'user_ok');
    assert.equal(parsed.grantsAuthority, false);
    assert.equal(
      parsed.performsExternalAction,
      false,
    );

    for (const invalid of [
      { ...event(), acceptedAtMs: NOW },
      { ...event(), forceCritical: true },
      event({ kind: 'risk_critical' }),
      event({ sequence: -1 }),
      event({
        generation:
          Number.MAX_SAFE_INTEGER + 1,
      }),

      event({
        emergencySessionId: 'ems_bad',
      }),
      event({
        eventId: 'emev_bad',
      }),
    ]) {
      assert.equal(
        eventModule.parseEmergencyUserEvent(
          invalid,
        ),
        null,
      );
    }
  },
);

test(
  'trusted event receipt derives time externally and never grants action authority',
  () => {
    const registry =
      new registryModule
        .EmergencyEventRegistry();

    const accepted =
      registry.apply(
        input(),
        NOW,
      );

    assert.equal(accepted.accepted, true);
    assert.equal(accepted.reason, 'accepted');
    assert.equal(
      accepted.event.acceptedAtMs,
      NOW,
    );

    assert.equal(
      accepted.event.grantsAuthority,
      false,
    );
    assert.equal(
      accepted.event.performsExternalAction,
      false,
    );
    assert.equal(
      accepted.grantsAuthority,
      false,
    );
    assert.equal(
      accepted.performsExternalAction,
      false,
    );
  },
);

test(
  'session account and generation substitution fail closed',
  () => {
    const cases = [
      input({
        event: event({
          emergencySessionId:
            'ems_fedcba9876543210',
        }),
      }),
      input({
        event: event({
          accountId: OTHER_ACCOUNT,
        }),
      }),
      input({
        event: event({
          generation: 1,
        }),
      }),
    ];

    const reasons = [
      'session_mismatch',
      'account_mismatch',
      'generation_mismatch',
    ];

    for (
      let index = 0;
      index < cases.length;
      index += 1
    ) {
      const registry =
        new registryModule
          .EmergencyEventRegistry();

      assert.equal(
        registry.apply(
          cases[index],
          NOW,
        ).reason,
        reasons[index],
      );
    }
  },
);

test(
  'revoked mismatched or forged source trust cannot authorize user events',
  () => {
    const revoked = trust({
      device: {
        ...trust().device,
        state: 'revoked',
      },
    });

    const mismatched = trust({
      expectedDeviceId: OTHER_DEVICE,
    });

    for (const sourceDeviceTrustInput of [
      revoked,
      mismatched,
      null,
    ]) {
      const registry =
        new registryModule
          .EmergencyEventRegistry();

      assert.equal(
        registry.apply(
          input({
            sourceDeviceTrustInput,
          }),
          NOW,
        ).reason,
        'source_untrusted',
      );
    }
  },
);

test(
  'event stream enforces exact sequence idempotence conflicts gaps and stale events',
  () => {
    const registry =
      new registryModule
        .EmergencyEventRegistry();

    assert.equal(
      registry.apply(
        input(),
        NOW,

      ).reason,
      'accepted',
    );

    const duplicate =
      registry.apply(
        input(),
        NOW + 1_000,
      );
    assert.equal(
      duplicate.reason,
      'duplicate',
    );
    assert.equal(
      duplicate.idempotent,
      true,
    );
    assert.equal(
      duplicate.event.acceptedAtMs,
      NOW,
    );

    assert.equal(
      registry.apply(
        input({
          event: event({
            kind: 'user_cancel',
          }),
        }),
        NOW + 2_000,
      ).reason,
      'sequence_conflict',
    );

    assert.equal(
      registry.apply(
        input({
          event: event({
            eventId:
              'emev_1111111111111111',
            sequence: 2,
          }),
        }),
        NOW + 3_000,
      ).reason,
      'sequence_gap',
    );

    assert.equal(
      registry.apply(
        input({
          event: event({
            eventId:
              'emev_1111111111111111',
            sequence: 1,
            kind: 'user_cancel',
          }),
        }),
        NOW + 4_000,
      ).reason,
      'accepted',
    );

    assert.equal(
      registry.apply(
        input(),
        NOW + 5_000,
      ).reason,
      'stale_sequence',
    );
  },
);

test(
  'event ids cannot replay across session generation or source bindings',
  () => {
    const registry =
      new registryModule
        .EmergencyEventRegistry();

    assert.equal(
      registry.apply(
        input(),
        NOW,
      ).reason,
      'accepted',
    );

    assert.equal(
      registry.apply(
        input({
          sessionState:
            issueSessionState({
              sessionOverrides: {
                emergencySessionId:
                  'ems_fedcba9876543210',
              },
            }),
          event: event({
            emergencySessionId:
              'ems_fedcba9876543210',
          }),
        }),

        NOW + 1,
      ).reason,
      'cross_session_replay',
    );

    assert.equal(
      registry.apply(
        input({
          sessionState:
            issueSessionState({
              generation: 1,
            }),
          event: event({
            generation: 1,
          }),
        }),
        NOW + 2,
      ).reason,
      'cross_generation_replay',
    );

    const otherTrust = {
      device: {
        deviceId: OTHER_DEVICE,
        accountId: ACCOUNT,
        deviceKeyId:
          'dkey_fedcba9876543210',
        publicKeyThumbprint:
          'B'.repeat(43),
        state: 'active',
        hardwareBacked: true,
      },
      expectedAccountId: ACCOUNT,
      expectedDeviceId: OTHER_DEVICE,
      expectedDeviceKeyId:
        'dkey_fedcba9876543210',
      expectedPublicKeyThumbprint:
        'B'.repeat(43),
    };

    assert.equal(
      registry.apply(
        input({
          sourceDeviceTrustInput:
            otherTrust,
          event: event({
            sourceDeviceId:
              OTHER_DEVICE,
            sequence: 1,
          }),
        }),
        NOW + 3,
      ).reason,
      'event_replay',
    );
  },
);

test(
  'trusted time rollback is rejected and a new generation starts a new sequence',
  () => {
    const registry =
      new registryModule
        .EmergencyEventRegistry();

    assert.equal(
      registry.apply(
        input(),
        NOW,
      ).reason,
      'accepted',
    );

    assert.equal(
      registry.apply(
        input({
          event: event({
            eventId:
              'emev_1111111111111111',
            sequence: 1,
          }),
        }),
        NOW - 1,
      ).reason,
      'non_monotonic_time',
    );

    assert.equal(
      registry.apply(
        input({
          sessionState:
            issueSessionState({
              generation: 1,
            }),
          event: event({
            eventId:
              'emev_2222222222222222',
            generation: 1,
            sequence: 0,
          }),
        }),
        NOW + 1,
      ).reason,
      'accepted',
    );

    assert.equal(
      registry.apply(
        input(),
        Number.NaN,
      ).reason,
      'invalid_input',
    );
  },
);
