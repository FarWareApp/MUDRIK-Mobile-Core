import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  ObservationPrivacyCoordinator,
} = loadTypeScriptModule(
  'src/core/privacy/ObservationPrivacyCoordinator.ts',
);

function snapshot(
  state,
  {
    recoveredFailClosed = false,
    reason = 'test',
    updatedAtMs = 1,
  } = {},
) {
  return {
    state,
    reason,
    updatedAtMs,
    recoveredFailClosed,
  };
}

function createRepository(
  initial,
  {
    writeError = null,
  } = {},
) {
  let current = initial;
  const writes = [];

  return {
    writes,
    getCurrent: () => current,
    repository: {
      get: async () => current,
      set: async (input) => {
        writes.push(input);
        if (writeError) {
          throw writeError;
        }
        current = snapshot(input.state, {
          reason: input.reason,
          updatedAtMs: input.updatedAtMs,
        });
        return current;
      },
    },
  };
}

function createSensors({
  visual = {
    confirmed: true,
    stoppedSensorIds: ['camera:front'],
    failedSensorIds: [],
  },
  all = {
    confirmed: true,
    stoppedSensorIds: ['camera:front', 'presence:room'],
    failedSensorIds: [],
  },
  throwVisual = false,
  throwAll = false,
} = {}) {
  const calls = [];

  return {
    calls,
    controller: {
      stopPassiveVisualObservation: async () => {
        calls.push('visual');
        if (throwVisual) {
          throw new Error('visual stop failed');
        }
        return visual;
      },
      stopAllPassiveObservation: async () => {
        calls.push('all');
        if (throwAll) {
          throw new Error('all stop failed');
        }
        return all;
      },
    },
  };
}

const REACTIVATION_OK = Object.freeze({
  explicitUserRequest: true,
  osPermissionGranted: true,
  deviceTrusted: true,
  runtimeAvailable: true,
});

test('privacy lock persists before all passive observation is stopped', async () => {
  const repo = createRepository(snapshot('active'));
  const sensors = createSensors();
  const coordinator = new ObservationPrivacyCoordinator(
    repo.repository,
    sensors.controller,
  );

  const result = await coordinator.apply({
    event: 'lock_privacy',
    nowMs: 100,
  });

  assert.deepEqual(repo.writes, [{
    state: 'privacy_lock',
    reason: 'privacy_event:lock_privacy',
    updatedAtMs: 100,
  }]);
  assert.deepEqual(sensors.calls, ['all']);
  assert.equal(result.state, 'privacy_lock');
  assert.equal(result.persisted, true);
  assert.equal(result.sensorStopConfirmed, true);
  assert.equal(result.allowed, true);
  assert.equal(result.reason, 'applied');
});

test('restriction remains effective when persistence fails', async () => {
  const repo = createRepository(
    snapshot('active'),
    { writeError: new Error('disk unavailable') },
  );
  const sensors = createSensors();
  const coordinator = new ObservationPrivacyCoordinator(
    repo.repository,
    sensors.controller,
  );

  const result = await coordinator.apply({
    event: 'lock_privacy',
    nowMs: 200,
  });

  assert.deepEqual(sensors.calls, ['all']);
  assert.equal(result.state, 'privacy_lock');
  assert.equal(result.persisted, false);
  assert.equal(result.sensorStopConfirmed, true);
  assert.equal(result.allowed, false);
  assert.equal(
    result.reason,
    'persistence_failed_restriction_retained',
  );
});

test('sensor stop failure never converts a restrictive command into success', async () => {
  const repo = createRepository(snapshot('active'));
  const sensors = createSensors({
    all: {
      confirmed: false,
      stoppedSensorIds: ['camera:front'],
      failedSensorIds: ['presence:room'],
    },
  });
  const coordinator = new ObservationPrivacyCoordinator(
    repo.repository,
    sensors.controller,
  );

  const result = await coordinator.apply({
    event: 'lock_privacy',
    nowMs: 300,
  });

  assert.equal(result.state, 'privacy_lock');
  assert.equal(result.persisted, true);
  assert.equal(result.sensorStopConfirmed, false);
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'sensor_stop_incomplete');
  assert.deepEqual(result.failedSensorIds, ['presence:room']);
});

test('restart re-enforces an already persisted privacy lock', async () => {
  const repo = createRepository(snapshot('privacy_lock'));
  const sensors = createSensors();
  const coordinator = new ObservationPrivacyCoordinator(
    repo.repository,
    sensors.controller,
  );

  const result = await coordinator.apply({
    event: 'app_restart',
    nowMs: 400,
  });

  assert.deepEqual(repo.writes, []);
  assert.deepEqual(sensors.calls, ['all']);
  assert.equal(result.state, 'privacy_lock');
  assert.equal(result.allowed, true);
  assert.equal(result.sensorStopConfirmed, true);
  assert.equal(result.reason, 'no_change');
});

test('device handoff re-enforces visual-off using visual sensors only', async () => {
  const repo = createRepository(snapshot('visual_off'));
  const sensors = createSensors();
  const coordinator = new ObservationPrivacyCoordinator(
    repo.repository,
    sensors.controller,
  );

  const result = await coordinator.apply({
    event: 'device_handoff',
    nowMs: 500,
  });

  assert.deepEqual(sensors.calls, ['visual']);
  assert.equal(result.state, 'visual_off');
  assert.equal(result.sensorStopConfirmed, true);
  assert.equal(result.reason, 'no_change');
});

test('broadening is denied when persistence fails', async () => {
  const repo = createRepository(
    snapshot('privacy_lock'),
    { writeError: new Error('disk unavailable') },
  );
  const sensors = createSensors();
  const coordinator = new ObservationPrivacyCoordinator(
    repo.repository,
    sensors.controller,
  );

  const result = await coordinator.apply({
    event: 'unlock_privacy',
    nowMs: 600,
    reactivationChecks: REACTIVATION_OK,
  });

  assert.deepEqual(sensors.calls, []);
  assert.equal(result.state, 'privacy_lock');
  assert.equal(result.allowed, false);
  assert.equal(result.persisted, true);
  assert.equal(
    result.reason,
    'persistence_failed_broadening_denied',
  );
});

test('reactivation cannot bypass missing OS permission or explicit request', async () => {
  const cases = [
    {
      explicitUserRequest: false,
      osPermissionGranted: true,
      deviceTrusted: true,
      runtimeAvailable: true,
    },
    {
      explicitUserRequest: true,
      osPermissionGranted: false,
      deviceTrusted: true,
      runtimeAvailable: true,
    },
  ];

  for (const checks of cases) {
    const repo = createRepository(snapshot('privacy_lock'));
    const sensors = createSensors();
    const coordinator = new ObservationPrivacyCoordinator(
      repo.repository,
      sensors.controller,
    );

    const result = await coordinator.apply({
      event: 'unlock_privacy',
      nowMs: 700,
      reactivationChecks: checks,
    });

    assert.equal(result.state, 'privacy_lock');
    assert.equal(result.allowed, false);
    assert.equal(result.reason, 'denied');
    assert.deepEqual(repo.writes, []);
    assert.deepEqual(sensors.calls, []);
  }
});

test('fail-closed recovered state is persisted again before restriction enforcement', async () => {
  const repo = createRepository(
    snapshot('privacy_lock', {
      recoveredFailClosed: true,
      reason: 'privacy_state_missing_or_invalid',
    }),
  );
  const sensors = createSensors();
  const coordinator = new ObservationPrivacyCoordinator(
    repo.repository,
    sensors.controller,
  );

  const result = await coordinator.apply({
    event: 'lock_privacy',
    nowMs: 800,
  });

  assert.equal(repo.writes.length, 1);
  assert.equal(repo.writes[0].state, 'privacy_lock');
  assert.deepEqual(sensors.calls, ['all']);
  assert.equal(result.persisted, true);
  assert.equal(result.sensorStopConfirmed, true);
});

test('invalid timestamp fails closed and actively stops passive observation', async () => {
  const repo = createRepository(snapshot('active'));
  const sensors = createSensors();
  const coordinator = new ObservationPrivacyCoordinator(
    repo.repository,
    sensors.controller,
  );

  const result = await coordinator.apply({
    event: 'lock_privacy',
    nowMs: Number.NaN,
  });

  assert.equal(result.state, 'privacy_lock');
  assert.equal(result.allowed, false);
  assert.equal(result.persisted, false);
  assert.equal(result.sensorStopConfirmed, true);
  assert.equal(result.reason, 'invalid_input_fail_closed');

  const unsafe = await coordinator.apply({
    event: 'unlock_privacy',
    nowMs: Number.MAX_SAFE_INTEGER + 1,
    reactivationChecks: REACTIVATION_OK,
  });
  assert.equal(unsafe.allowed, false);
  assert.equal(unsafe.state, 'privacy_lock');
  assert.deepEqual(repo.writes, []);
  assert.deepEqual(sensors.calls, ['all']);
});

test('policy read failure fails closed and stops all passive observation', async () => {
  const sensors = createSensors();
  const coordinator = new ObservationPrivacyCoordinator(
    {
      get: async () => {
        throw new Error('database read failed');
      },
      set: async () => {
        throw new Error('must not write after failed read');
      },
    },
    sensors.controller,
  );

  const result = await coordinator.apply({
    event: 'unlock_privacy',
    nowMs: 900,
    reactivationChecks: REACTIVATION_OK,
  });

  assert.equal(result.state, 'privacy_lock');
  assert.equal(result.persisted, false);
  assert.equal(result.sensorStopConfirmed, true);
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'policy_read_failed_fail_closed');
  assert.deepEqual(sensors.calls, ['all']);
});

test('stale broadening is denied against a newer persisted restriction', async () => {
  const repo = createRepository(snapshot('privacy_lock', { updatedAtMs: 1_000 }));
  const sensors = createSensors();
  const coordinator = new ObservationPrivacyCoordinator(
    repo.repository,
    sensors.controller,
  );

  const result = await coordinator.apply({
    event: 'unlock_privacy',
    nowMs: 999,
    reactivationChecks: REACTIVATION_OK,
  });

  assert.equal(result.state, 'privacy_lock');
  assert.equal(result.persisted, true);
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'stale_broadening_denied');
  assert.deepEqual(repo.writes, []);
  assert.deepEqual(sensors.calls, []);
});

test('restrictive writes never move the persisted privacy clock backwards', async () => {
  const repo = createRepository(snapshot('active', { updatedAtMs: 1_000 }));
  const sensors = createSensors();
  const coordinator = new ObservationPrivacyCoordinator(
    repo.repository,
    sensors.controller,
  );

  const result = await coordinator.apply({
    event: 'lock_privacy',
    nowMs: 900,
  });

  assert.equal(result.state, 'privacy_lock');
  assert.equal(result.allowed, true);
  assert.equal(repo.writes.length, 1);
  assert.equal(repo.writes[0].updatedAtMs, 1_000);
});

test('privacy commands execute in invocation order so a later lock cannot be overtaken', async () => {
  let current = snapshot('privacy_lock', { updatedAtMs: 100 });
  const writes = [];
  let releaseActiveWrite;
  let markActiveWriteStarted;
  const activeWriteGate = new Promise((resolve) => {
    releaseActiveWrite = resolve;
  });
  const activeWriteStarted = new Promise((resolve) => {
    markActiveWriteStarted = resolve;
  });

  const repository = {
    get: async () => current,
    set: async (input) => {
      writes.push(input);
      if (input.state === 'active') {
        markActiveWriteStarted();
        await activeWriteGate;
      }
      current = snapshot(input.state, {
        reason: input.reason,
        updatedAtMs: input.updatedAtMs,
      });
      return current;
    },
  };
  const sensors = createSensors();
  const coordinator = new ObservationPrivacyCoordinator(
    repository,
    sensors.controller,
  );

  const unlockPromise = coordinator.apply({
    event: 'unlock_privacy',
    nowMs: 200,
    reactivationChecks: REACTIVATION_OK,
  });

  await activeWriteStarted;

  const lockPromise = coordinator.apply({
    event: 'lock_privacy',
    nowMs: 300,
  });

  await Promise.resolve();
  assert.deepEqual(writes.map((write) => write.state), ['active']);

  releaseActiveWrite();
  const [unlockResult, lockResult] = await Promise.all([
    unlockPromise,
    lockPromise,
  ]);

  assert.equal(unlockResult.state, 'active');
  assert.equal(lockResult.state, 'privacy_lock');
  assert.equal(current.state, 'privacy_lock');
  assert.deepEqual(
    writes.map((write) => write.state),
    ['active', 'privacy_lock'],
  );
  assert.deepEqual(sensors.calls, ['all']);
});
