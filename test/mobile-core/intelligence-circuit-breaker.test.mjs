import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  IntelligenceCircuitBreakerRegistry,
} = loadTypeScriptModule(
  'src/core/intelligence/intelligenceCircuitBreaker.ts',
);

const PROVIDER = 'provider_1111111111111111';
const MODEL = 'model_1111111111111111';
const NOW = 2_000_000_000;

const policy = {
  failureThreshold: 3,
  failureWindowMs: 60_000,
  cooldownMs: 30_000,
  halfOpenMaxAttempts: 2,
  halfOpenSuccessesToClose: 2,
};

test('provider failures open the circuit after threshold', () => {
  const registry =
    new IntelligenceCircuitBreakerRegistry(policy);

  assert.equal(
    registry.admit(PROVIDER, MODEL, NOW).allowed,
    true,
  );

  registry.recordFailure(
    PROVIDER,
    MODEL,
    'timeout',
    NOW + 1,
  );
  registry.recordFailure(
    PROVIDER,
    MODEL,
    'provider_unavailable',
    NOW + 2,
  );

  assert.equal(
    registry.admit(PROVIDER, MODEL, NOW + 3).allowed,
    true,
  );

  const opened =
    registry.recordFailure(
      PROVIDER,
      MODEL,
      'invalid_response',
      NOW + 4,
    );

  assert.equal(opened?.state, 'open');

  const denied =
    registry.admit(
      PROVIDER,
      MODEL,
      NOW + 5,
    );

  assert.equal(denied.allowed, false);
  assert.equal(denied.reason, 'circuit_open');
});

test('policy and permission failures do not poison provider health', () => {
  const registry =
    new IntelligenceCircuitBreakerRegistry(policy);

  for (const code of [
    'permission_denied',
    'policy_denied',
    'unsupported_input',
    'cancelled',
  ]) {
    registry.recordFailure(
      PROVIDER,
      MODEL,
      code,
      NOW + 1,
    );
  }

  const snapshot =
    registry.getSnapshot(PROVIDER, MODEL);

  assert.equal(snapshot?.state, 'closed');
  assert.equal(snapshot?.failureCount, 0);
});

test('cooldown transitions to bounded half-open probes', () => {
  const registry =
    new IntelligenceCircuitBreakerRegistry(policy);

  registry.recordFailure(PROVIDER, MODEL, 'timeout', NOW);
  registry.recordFailure(PROVIDER, MODEL, 'timeout', NOW + 1);
  registry.recordFailure(PROVIDER, MODEL, 'timeout', NOW + 2);

  const before =
    registry.admit(
      PROVIDER,
      MODEL,
      NOW + 29_000,
    );
  assert.equal(before.allowed, false);

  const probe =
    registry.admit(
      PROVIDER,
      MODEL,
      NOW + 30_002,
    );

  assert.equal(probe.allowed, true);
  assert.equal(probe.probe, true);
  assert.equal(probe.reason, 'half_open_probe');

  registry.recordAttemptStarted(
    PROVIDER,
    MODEL,
    NOW + 30_003,
  );
  registry.recordAttemptStarted(
    PROVIDER,
    MODEL,
    NOW + 30_004,
  );

  const exhausted =
    registry.admit(
      PROVIDER,
      MODEL,
      NOW + 30_005,
    );

  assert.equal(exhausted.allowed, false);
  assert.equal(
    exhausted.reason,
    'probe_budget_exhausted',
  );
});

test('successful half-open probes close the circuit', () => {
  const registry =
    new IntelligenceCircuitBreakerRegistry(policy);

  registry.recordFailure(PROVIDER, MODEL, 'timeout', NOW);
  registry.recordFailure(PROVIDER, MODEL, 'timeout', NOW + 1);
  registry.recordFailure(PROVIDER, MODEL, 'timeout', NOW + 2);

  registry.admit(
    PROVIDER,
    MODEL,
    NOW + 30_002,
  );
  registry.recordAttemptStarted(
    PROVIDER,
    MODEL,
    NOW + 30_003,
  );
  registry.recordSuccess(
    PROVIDER,
    MODEL,
    NOW + 30_004,
  );

  assert.equal(
    registry.getSnapshot(PROVIDER, MODEL)?.state,
    'half-open',
  );

  registry.recordAttemptStarted(
    PROVIDER,
    MODEL,
    NOW + 30_005,
  );
  registry.recordSuccess(
    PROVIDER,
    MODEL,
    NOW + 30_006,
  );

  const snapshot =
    registry.getSnapshot(PROVIDER, MODEL);

  assert.equal(snapshot?.state, 'closed');
  assert.equal(snapshot?.failureCount, 0);
});

test('half-open failure immediately reopens the circuit', () => {
  const registry =
    new IntelligenceCircuitBreakerRegistry(policy);

  registry.recordFailure(PROVIDER, MODEL, 'timeout', NOW);
  registry.recordFailure(PROVIDER, MODEL, 'timeout', NOW + 1);
  registry.recordFailure(PROVIDER, MODEL, 'timeout', NOW + 2);

  registry.admit(
    PROVIDER,
    MODEL,
    NOW + 30_002,
  );
  registry.recordAttemptStarted(
    PROVIDER,
    MODEL,
    NOW + 30_003,
  );

  const reopened =
    registry.recordFailure(
      PROVIDER,
      MODEL,
      'timeout',
      NOW + 30_004,
    );

  assert.equal(reopened?.state, 'open');
  assert.equal(
    reopened?.retryAtMs,
    NOW + 60_004,
  );
});
