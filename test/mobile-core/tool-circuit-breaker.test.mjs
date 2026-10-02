import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  ToolCircuitBreakerRegistry,
} = loadTypeScriptModule(
  'src/core/tools/toolCircuitBreaker.ts',
);

const NOW = 3_500_000_000;
const TOOL =
  'tool_1111111111111111';

function breaker() {
  return new ToolCircuitBreakerRegistry({
    failureThreshold: 2,
    failureWindowMs: 60_000,
    cooldownMs: 10_000,
    halfOpenMaxAttempts: 2,
    halfOpenSuccessesToClose: 1,
  });
}

test('circuit opens after bounded failures', () => {
  const registry = breaker();

  assert.equal(
    registry.admit(TOOL, NOW).allowed,
    true,
  );

  registry.recordFailure(
    TOOL,
    NOW + 100,
  );

  assert.equal(
    registry.admit(
      TOOL,
      NOW + 200,
    ).allowed,
    true,
  );

  const opened =
    registry.recordFailure(
      TOOL,
      NOW + 300,
    );

  assert.equal(opened?.state, 'open');

  const denied =
    registry.admit(
      TOOL,
      NOW + 400,
    );

  assert.equal(denied.allowed, false);
  assert.equal(
    denied.reason,
    'circuit_open',
  );
});

test('circuit enters half-open after cooldown and success closes it', () => {
  const registry = breaker();

  registry.recordFailure(
    TOOL,
    NOW + 100,
  );
  registry.recordFailure(
    TOOL,
    NOW + 200,
  );

  const probe =
    registry.admit(
      TOOL,
      NOW + 10_201,
    );

  assert.equal(probe.allowed, true);
  assert.equal(probe.probe, true);
  assert.equal(
    probe.reason,
    'half_open_probe',
  );

  registry.recordAttemptStarted(
    TOOL,
    NOW + 10_201,
  );

  const closed =
    registry.recordSuccess(
      TOOL,
      NOW + 10_202,
    );

  assert.equal(closed?.state, 'closed');
  assert.equal(
    closed?.failureCount,
    0,
  );
});

test('half-open failure reopens immediately', () => {
  const registry = breaker();

  registry.recordFailure(
    TOOL,
    NOW + 100,
  );
  registry.recordFailure(
    TOOL,
    NOW + 200,
  );

  registry.admit(
    TOOL,
    NOW + 10_201,
  );
  registry.recordAttemptStarted(
    TOOL,
    NOW + 10_201,
  );

  const reopened =
    registry.recordFailure(
      TOOL,
      NOW + 10_202,
    );

  assert.equal(reopened?.state, 'open');
  assert.equal(
    reopened?.retryAtMs,
    NOW + 20_202,
  );
});

test('time rollback and invalid tool identity fail closed', () => {
  const registry = breaker();

  registry.admit(
    TOOL,
    NOW + 100,
  );

  assert.equal(
    registry.admit(
      TOOL,
      NOW,
    ).reason,
    'invalid_input',
  );

  assert.equal(
    registry.admit(
      'bad_tool',
      NOW,
    ).reason,
    'invalid_input',
  );
});
