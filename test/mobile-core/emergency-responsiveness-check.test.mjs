import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const responsivenessModule = loadTypeScriptModule(
  'src/core/emergency/emergencyResponsivenessCheck.ts',
);
const eventRegistryModule = loadTypeScriptModule(
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
const DEVICE = 'dev_0123456789abcdef';
const KEY = 'dkey_0123456789abcdef';
const THUMB = 'A'.repeat(43);

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

function session(overrides = {}) {
  return {
    emergencySessionId:
      'ems_0123456789abcdef',
    accountId: ACCOUNT,
    sourceDeviceId: DEVICE,
    configId: 'egc_0123456789abcdef',
    configRevision: 4,
    mode: 'simulation',
    openedAtMs: 90_000,
    simulationOnly: true,
    grantsAuthority: false,
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

function checkingSessionState({
  sessionOverrides = {},
  sessionConfigOverrides = {},
  generation = 0,
  createdAtMs = NOW,
  transitionedAtMs =
    createdAtMs + (generation * 2),
} = {}) {
  const created =
    sessionStateModule
      .createEmergencyGuardianSessionState(
        registeredSession({
          sessionOverrides,
          configOverrides:
            sessionConfigOverrides,
          openedAtMs: createdAtMs,
        }),
        createdAtMs,
      );

  assert.equal(created.accepted, true);

  let current = created.state;
  let transitionTime = createdAtMs;

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
          transitionTime,
        );
    assert.equal(resolved.accepted, true);

    transitionTime += 1;

    const reset =
      sessionStateModule
        .transitionEmergencyGuardianSessionState(
          {
            sessionState: resolved.next,
            event: 'reset',
          },
          transitionTime,
        );
    assert.equal(reset.accepted, true);
    current = reset.next;
    transitionTime += 1;
  }

  const transitioned =
    sessionStateModule
      .transitionEmergencyGuardianSessionState(
        {
          sessionState: current,
          event: 'request_check',
        },
        transitionedAtMs,
      );

  assert.equal(transitioned.accepted, true);
  assert.equal(
    transitioned.next.state.phase,
    'check_user',
  );

  return transitioned.next;
}

function startInput(overrides = {}) {
  return {
    checkId: 'emrc_0123456789abcdef',
    sessionState: checkingSessionState(),
    config: config(),
    ...overrides,
  };
}

function trust() {
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
  };
}

function userEvent(overrides = {}) {
  return {
    emergencySessionId:
      'ems_0123456789abcdef',

    eventId: 'emev_0123456789abcdef',
    sequence: 0,
    accountId: ACCOUNT,
    sourceDeviceId: DEVICE,
    generation: 0,
    kind: 'user_ok',
    ...overrides,
  };
}

function acceptUserEvent(
  acceptedAtMs,
  overrides = {},
  bindingOverrides = {},
) {
  const registry =
    new eventRegistryModule
      .EmergencyEventRegistry();

  const generation =
    typeof overrides.generation === 'number'
      ? overrides.generation
      : 0;
  const decision =
    registry.apply(
      {
        sessionState:
          checkingSessionState({
            generation,
          }),
        sourceDeviceTrustInput: trust(),
        event: userEvent(overrides),
        ...bindingOverrides,
      },
      acceptedAtMs,
    );

  assert.equal(decision.accepted, true);
  return decision.event;
}

test(
  'responsiveness check derives trusted start and deadline without authority',
  () => {
    const started =
      responsivenessModule
        .startEmergencyResponsivenessCheck(
          startInput(),
          NOW,
        );

    assert.equal(started.accepted, true);
    assert.equal(started.reason, 'accepted');
    assert.equal(
      started.check.startedAtMs,
      NOW,
    );
    assert.equal(
      started.check.deadlineAtMs,
      NOW + 10_000,
    );
    assert.equal(
      started.check.timeoutMs,
      10_000,
    );
    assert.equal(
      started.check.simulationOnly,
      true,
    );
    assert.equal(
      started.grantsAuthority,

      false,
    );
    assert.equal(
      started.performsExternalAction,
      false,
    );
  },
);

test(
  'start fails closed for disabled mismatched stale or hidden configuration',
  () => {
    const cases = [
      [
        startInput({
          config: config({
            enabled: false,
          }),
        }),
        'guardian_disabled',
      ],
      [
        startInput({
          config: config({
            accountId:
              'acct_fedcba9876543210',
          }),
        }),
        'account_mismatch',
      ],
      [
        startInput({
          config: config({
            revision: 5,
          }),
        }),

        'session_config_mismatch',
      ],
      [
        startInput({
          config: config({
            mode: 'live',
          }),
        }),
        'session_config_mismatch',
      ],
      [
        {
          ...startInput(),
          forceTimeout: true,
        },
        'invalid_input',
      ],
    ];

    for (const [value, reason] of cases) {
      assert.equal(
        responsivenessModule
          .startEmergencyResponsivenessCheck(
            value,
            NOW,
          ).reason,
        reason,
      );
    }
  },
);

test(
  'invalid ids generations future session snapshots and deadline overflow fail closed',

  () => {
    const invalid = [
      startInput({
        checkId: 'emrc_bad',
      }),
      startInput({
        generation: -1,
      }),
      startInput({
        sessionState: {
          ...checkingSessionState(),
          session: session({
            openedAtMs: NOW + 1,
          }),
        },
      }),
      startInput({
        sessionState: {
          ...checkingSessionState(),
          grantsAuthority: true,
        },
      }),
    ];

    for (const value of invalid) {
      assert.equal(
        responsivenessModule
          .startEmergencyResponsivenessCheck(
            value,
            NOW,
          ).reason,
        'invalid_input',
      );
    }


    assert.equal(
      responsivenessModule
        .startEmergencyResponsivenessCheck(
          startInput({
            sessionState:
              checkingSessionState({
                createdAtMs:
                  Number.MAX_SAFE_INTEGER
                  - 2_000,
              }),
            config: config({
              responsivenessTimeoutMs:
                3_000,
              updatedAtMs:
                Number.MAX_SAFE_INTEGER
                - 2_000,
            }),
          }),
          Number.MAX_SAFE_INTEGER
            - 2_000,
        ).reason,
      'time_overflow',
    );
  },
);


test(
  'check remains pending before deadline and times out exactly at deadline',
  () => {
    const check =
      responsivenessModule
        .startEmergencyResponsivenessCheck(
          startInput(),
          NOW,
        ).check;

    const pending =
      responsivenessModule
        .evaluateEmergencyResponsivenessCheck(
          {
            check,
            event: null,
          },
          NOW + 9_999,
        );
    assert.equal(pending.status, 'pending');
    assert.equal(pending.reason, 'pending');

    const timedOut =
      responsivenessModule
        .evaluateEmergencyResponsivenessCheck(
          {
            check,

            event: null,
          },
          NOW + 10_000,
        );

    assert.equal(
      timedOut.status,
      'timed_out',
    );
    assert.equal(
      timedOut.reason,
      'timed_out',
    );
    assert.equal(
      timedOut.userEventKind,
      null,
    );
    assert.equal(
      timedOut.grantsAuthority,
      false,
    );
    assert.equal(
      timedOut.performsExternalAction,
      false,
    );
    assert.equal(
      timedOut.timeoutDerivedFromTrustedTime,
      true,
    );
  },
);


test(
  'trusted user event received before deadline makes the check responsive',
  () => {
    const check =
      responsivenessModule
        .startEmergencyResponsivenessCheck(
          startInput(),
          NOW,
        ).check;
    const acceptedEvent =
      acceptUserEvent(
        NOW + 5_000,
      );

    const evaluated =
      responsivenessModule
        .evaluateEmergencyResponsivenessCheck(
          {
            check,
            event: acceptedEvent,
          },
          NOW + 5_000,
        );

    assert.equal(
      evaluated.accepted,
      true,

    );
    assert.equal(
      evaluated.status,
      'responsive',
    );
    assert.equal(
      evaluated.reason,
      'responsive',
    );
    assert.equal(
      evaluated.userEventKind,
      'user_ok',
    );
  },
);

test(
  'late response stays timed out and cannot rewrite the deadline',
  () => {
    const check =
      responsivenessModule
        .startEmergencyResponsivenessCheck(
          startInput(),
          NOW,
        ).check;
    const acceptedEvent =
      acceptUserEvent(
        NOW + 10_001,
      );

    const evaluated =

      responsivenessModule
        .evaluateEmergencyResponsivenessCheck(
          {
            check,
            event: acceptedEvent,
          },
          NOW + 10_001,
        );

    assert.equal(
      evaluated.status,
      'timed_out',
    );
    assert.equal(
      evaluated.reason,
      'late_response',
    );
    assert.equal(
      evaluated.deadlineAtMs,
      NOW + 10_000,
    );
  },
);


test(
  'events before check future events and binding substitutions fail closed',
  () => {
    const check =
      responsivenessModule
        .startEmergencyResponsivenessCheck(
          startInput(),
          NOW,
        ).check;

    const before =
      acceptUserEvent(
        NOW - 1,
      );

    assert.equal(
      responsivenessModule
        .evaluateEmergencyResponsivenessCheck(
          {
            check,
            event: before,
          },
          NOW,
        ).reason,
      'event_before_check',
    );


    const future =
      acceptUserEvent(
        NOW + 1,
      );

    assert.equal(
      responsivenessModule
        .evaluateEmergencyResponsivenessCheck(
          {
            check,
            event: future,
          },
          NOW,
        ).reason,
      'future_event',
    );

    const mismatched =
      acceptUserEvent(
        NOW + 2,
        {
          generation: 1,
        },
      );

    assert.equal(
      responsivenessModule
        .evaluateEmergencyResponsivenessCheck(
          {
            check,
            event: mismatched,

          },
          NOW + 2,
        ).reason,
      'event_binding_mismatch',
    );
  },
);


test(
  'trusted-time rollback on a check is reported distinctly from malformed input',
  () => {
    const check =
      responsivenessModule
        .startEmergencyResponsivenessCheck(
          startInput(),
          NOW,
        ).check;

    assert.equal(
      responsivenessModule
        .evaluateEmergencyResponsivenessCheck(
          {
            check,
            event: null,
          },
          NOW - 1,
        ).reason,
      'non_monotonic_time',
    );
  },
);

test(
  'responsiveness provenance rejects copied checks and forged timeout results',
  () => {
    const check =
      responsivenessModule
        .startEmergencyResponsivenessCheck(
          startInput(),
          NOW,
        ).check;
    const copiedCheck = {
      ...check,
    };

    assert.equal(
      responsivenessModule
        .isEmergencyResponsivenessCheck(
          check,
        ),
      true,
    );
    assert.equal(
      responsivenessModule
        .isEmergencyResponsivenessCheck(
          copiedCheck,
        ),
      false,
    );
    assert.equal(
      responsivenessModule
        .evaluateEmergencyResponsivenessCheck(
          {
            check: copiedCheck,
            event: null,
          },
          NOW + 10_000,
        ).reason,
      'untrusted_check_provenance',
    );

    const timedOut =
      responsivenessModule
        .evaluateEmergencyResponsivenessCheck(
          {
            check,
            event: null,
          },
          NOW + 10_000,
        );

    assert.equal(
      responsivenessModule
        .isEmergencyResponsivenessEvaluationFor(
          timedOut,
          check,
        ),
      true,
    );
    assert.equal(
      responsivenessModule
        .isEmergencyResponsivenessEvaluationFor(
          {
            ...timedOut,
          },
          check,
        ),
      false,
    );
    assert.equal(
      responsivenessModule
        .isEmergencyResponsivenessEvaluationFor(
          {
            ...timedOut,
            status: 'timed_out',
          },
          check,
        ),
      false,
    );
  },
);


test(
  'forged accepted-event metadata and evaluation fields are rejected',
  () => {
    const check =
      responsivenessModule
        .startEmergencyResponsivenessCheck(
          startInput(),
          NOW,
        ).check;
    const acceptedEvent =
      acceptUserEvent(
        NOW + 1,
      );

    for (const hostile of [
      {
        ...acceptedEvent,
      },
      {
        ...acceptedEvent,
        grantsAuthority: true,
      },
      {
        ...acceptedEvent,
        acceptedAtMs: Number.NaN,
      },
      {
        ...acceptedEvent,
        forceEscalation: true,
      },
    ]) {

      assert.equal(
        responsivenessModule
          .evaluateEmergencyResponsivenessCheck(
            {
              check,
              event: hostile,
            },
            NOW + 1,
          ).reason,
        'untrusted_event_provenance',
      );
    }

    assert.equal(
      responsivenessModule
        .evaluateEmergencyResponsivenessCheck(
          {
            check,
            event: acceptedEvent,
            timeoutAtMs: 1,
          },
          NOW + 1,
        ).reason,
      'invalid_input',
    );
  },
);
