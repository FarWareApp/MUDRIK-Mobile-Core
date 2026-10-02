import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  ToolExecutionCoordinator,
  parseToolAdapterOutput,
} = loadTypeScriptModule(
  'src/core/tools/toolExecutionCoordinator.ts',
);

const {
  routeToolRequest,
} = loadTypeScriptModule(
  'src/core/tools/toolOrchestrator.ts',
);

const {
  ToolCircuitBreakerRegistry,
} = loadTypeScriptModule(
  'src/core/tools/toolCircuitBreaker.ts',
);

const {
  ToolConcurrencyGate,
} = loadTypeScriptModule(
  'src/core/tools/toolConcurrencyGate.ts',
);

const NOW = 3_300_000_000;

function registration(
  index,
  overrides = {},
) {
  const suffix =
    String(index).repeat(16);

  return {
    protocolVersion: '1.0',
    toolRef: 'tool_' + suffix,
    adapterRef:
      'adapter_ref_' + suffix,
    supportedOperations: [
      'operation_ref_write_111111111111',
    ],
    capabilities: [
      'filesystem.write',
    ],
    executionMode: 'local',
    health: 'ready',
    trustScore: 900 - index,
    qualityScore: 900 - index,
    firstResultMs: 100 + index,
    maxConcurrent: 2,
    parallelSafe: true,
    supportsRollback: true,
    sideEffectSupport: 'reversible',
    registeredAtMs: NOW,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function request() {
  return {
    goalId:
      'goal_1111111111111111',
    planId:
      'goal_plan_1111111111111111',
    stepId:
      'goal_step_1111111111111111',
    operationRef:
      'operation_ref_write_111111111111',
    requiredCapabilities: [
      'filesystem.write',
    ],
    sideEffect: true,
    rollbackRef:
      'rollback_ref_1111111111111111',
    preferLocal: true,
    maximumFallbacks: 2,
  };
}

function route() {
  return routeToolRequest(
    request(),
    [
      registration(1),
      registration(2),
    ],
  );
}

function lease() {
  return {
    protocolVersion: '1.0',
    leaseId:
      'goal_lease_1111111111111111',
    goalId:
      'goal_1111111111111111',
    planId:
      'goal_plan_1111111111111111',
    stepId:
      'goal_step_1111111111111111',
    operationRef:
      'operation_ref_write_111111111111',
    issuedAtMs: NOW,
    expiresAtMs: NOW + 30_000,
    generation: 0,
    approvalRef:
      'approval_ref_1111111111111111',
    grantIds: [
      'grant_ref_1111111111111111',
    ],
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
  };
}

function output(
  status,
  overrides = {},
) {
  const success = status === 'succeeded';

  return {
    protocolVersion: '1.0',
    status,
    resultRef:
      success
        ? 'result_ref_1111111111111111'
        : null,
    evidenceRef:
      'evidence_ref_1111111111111111',
    failureReason:
      success
        ? null
        : 'provider_unavailable',
    retryable: !success,
    sideEffectCommitted: success,
    completedAtMs: NOW + 500,
    grantsExecutionAuthority: false,
    grantsSensorAuthority: false,
    grantsApprovalAuthority: false,
    grantsCapabilityAuthority: false,
    ...overrides,
  };
}

function resolver(handlers) {
  return {
    resolve(candidate) {
      const handler =
        handlers[candidate.toolRef];

      if (!handler) {
        return null;
      }

      return {
        toolRef: candidate.toolRef,
        execute: handler,
      };
    },
  };
}

function input(overrides = {}) {
  return {
    route: route(),
    lease: lease(),
    sideEffect: true,
    maxAttempts: 2,
    deadlineAtMs: NOW + 20_000,
    ...overrides,
  };
}

test('retryable pre-commit failure falls back and preserves idempotency key', async () => {
  const invocations = [];

  const runtime =
    new ToolExecutionCoordinator(
      resolver({
        tool_1111111111111111:
          async (invocation) => {
            invocations.push(invocation);
            return output('failed', {
              sideEffectCommitted: false,
              completedAtMs: NOW + 200,
            });
          },
        tool_2222222222222222:
          async (invocation) => {
            invocations.push(invocation);
            return output('succeeded', {
              completedAtMs: NOW + 300,
            });
          },
      }),
      () => NOW + 100,
    );

  const result =
    await runtime.execute(input());

  assert.equal(result.status, 'succeeded');
  assert.equal(result.attempts, 2);
  assert.equal(
    result.toolRef,
    'tool_2222222222222222',
  );
  assert.equal(invocations.length, 2);
  assert.equal(
    invocations[0].idempotencyKey,
    lease().leaseId,
  );
  assert.equal(
    invocations[1].idempotencyKey,
    lease().leaseId,
  );
});

test('committed side-effect failure stops fallback and requires reconciliation', async () => {
  let secondCalled = false;

  const runtime =
    new ToolExecutionCoordinator(
      resolver({
        tool_1111111111111111:
          async () =>
            output('failed', {
              retryable: true,
              sideEffectCommitted: true,
              failureReason:
                'post_commit_timeout',
            }),
        tool_2222222222222222:
          async () => {
            secondCalled = true;
            return output('succeeded');
          },
      }),
      () => NOW + 100,
    );

  const result =
    await runtime.execute(input());

  assert.equal(
    result.status,
    'needs_reconciliation',
  );
  assert.equal(
    result.failureReason,
    'post_commit_timeout',
  );
  assert.equal(secondCalled, false);
});

test('non-retryable failure stops immediately', async () => {
  let secondCalled = false;

  const runtime =
    new ToolExecutionCoordinator(
      resolver({
        tool_1111111111111111:
          async () =>
            output('failed', {
              retryable: false,
              sideEffectCommitted: false,
              failureReason:
                'permission_denied',
            }),
        tool_2222222222222222:
          async () => {
            secondCalled = true;
            return output('succeeded');
          },
      }),
      () => NOW + 100,
    );

  const result =
    await runtime.execute(input());

  assert.equal(result.status, 'failed');
  assert.equal(result.attempts, 1);
  assert.equal(
    result.failureReason,
    'permission_denied',
  );
  assert.equal(secondCalled, false);
});

test('malformed output after side-effect dispatch requires reconciliation', async () => {
  let fallbackCalled = false;

  const runtime =
    new ToolExecutionCoordinator(
      resolver({
        tool_1111111111111111:
          async () => ({
            status: 'succeeded',
            resultRef:
              'result_ref_1111111111111111',
          }),
        tool_2222222222222222:
          async () => {
            fallbackCalled = true;
            return output('succeeded', {
              completedAtMs: NOW + 400,
            });
          },
      }),
      () => NOW + 100,
    );

  const result =
    await runtime.execute(input());

  assert.equal(
    result.status,
    'needs_reconciliation',
  );
  assert.equal(result.attempts, 1);
  assert.equal(
    result.failureReason,
    'invalid_tool_output_commit_unknown',
  );
  assert.equal(fallbackCalled, false);
});

test('deadline and lease expiry fail closed before adapter call', async () => {
  let called = false;

  const runtime =
    new ToolExecutionCoordinator(
      resolver({
        tool_1111111111111111:
          async () => {
            called = true;
            return output('succeeded');
          },
      }),
      () => NOW + 30_000,
    );

  const result =
    await runtime.execute(input());

  assert.equal(result.status, 'failed');
  assert.equal(
    result.failureReason,
    'deadline_exceeded',
  );
  assert.equal(called, false);
});

test('successful side-effect claim mismatch requires reconciliation', async () => {
  const runtime =
    new ToolExecutionCoordinator(
      resolver({
        tool_1111111111111111:
          async () =>
            output('succeeded', {
              sideEffectCommitted: false,
            }),
      }),
      () => NOW + 100,
    );

  const result =
    await runtime.execute(input());

  assert.equal(
    result.status,
    'needs_reconciliation',
  );
  assert.equal(
    result.failureReason,
    'side_effect_commit_mismatch',
  );
});

test('adapter output parser rejects authority escalation', () => {
  assert.ok(
    parseToolAdapterOutput(
      output('succeeded'),
    ),
  );

  assert.equal(
    parseToolAdapterOutput(
      output('succeeded', {
        grantsCapabilityAuthority: true,
      }),
    ),
    null,
  );
});


test('open primary circuit is skipped and healthy fallback executes', async () => {
  const circuit =
    new ToolCircuitBreakerRegistry({
      failureThreshold: 1,
      failureWindowMs: 60_000,
      cooldownMs: 10_000,
      halfOpenMaxAttempts: 1,
      halfOpenSuccessesToClose: 1,
    });

  circuit.recordFailure(
    'tool_1111111111111111',
    NOW,
  );

  let primaryCalled = false;
  let fallbackCalled = false;

  const runtime =
    new ToolExecutionCoordinator(
      resolver({
        tool_1111111111111111:
          async () => {
            primaryCalled = true;
            return output('succeeded');
          },
        tool_2222222222222222:
          async () => {
            fallbackCalled = true;
            return output('succeeded', {
              completedAtMs: NOW + 300,
            });
          },
      }),
      () => NOW + 100,
      circuit,
    );

  const result =
    await runtime.execute(input());

  assert.equal(result.status, 'succeeded');
  assert.equal(primaryCalled, false);
  assert.equal(fallbackCalled, true);
  assert.equal(
    result.toolRef,
    'tool_2222222222222222',
  );
});

test('permission denial does not poison tool health circuit', async () => {
  const circuit =
    new ToolCircuitBreakerRegistry({
      failureThreshold: 1,
      failureWindowMs: 60_000,
      cooldownMs: 10_000,
      halfOpenMaxAttempts: 1,
      halfOpenSuccessesToClose: 1,
    });

  const runtime =
    new ToolExecutionCoordinator(
      resolver({
        tool_1111111111111111:
          async () =>
            output('failed', {
              retryable: false,
              sideEffectCommitted: false,
              failureReason: 'permission_denied',
            }),
      }),
      () => NOW + 100,
      circuit,
    );

  const result =
    await runtime.execute(input({
      maxAttempts: 1,
    }));

  assert.equal(result.status, 'failed');
  assert.equal(
    circuit.admit(
      'tool_1111111111111111',
      NOW + 200,
    ).allowed,
    true,
  );
});

test('adapter exception after side-effect dispatch never falls through to fallback', async () => {
  let fallbackCalled = false;

  const runtime =
    new ToolExecutionCoordinator(
      resolver({
        tool_1111111111111111:
          async () => {
            throw new Error('transport_lost');
          },
        tool_2222222222222222:
          async () => {
            fallbackCalled = true;
            return output('succeeded');
          },
      }),
      () => NOW + 100,
    );

  const result =
    await runtime.execute(input());

  assert.equal(
    result.status,
    'needs_reconciliation',
  );
  assert.equal(
    result.failureReason,
    'adapter_exception_commit_unknown',
  );
  assert.equal(result.attempts, 1);
  assert.equal(fallbackCalled, false);
});

test('concurrency gate prevents duplicate in-flight execution of one lease', async () => {
  const concurrency =
    new ToolConcurrencyGate(
      [
        {
          toolRef: 'tool_1111111111111111',
          maxConcurrent: 1,
        },
        {
          toolRef: 'tool_2222222222222222',
          maxConcurrent: 1,
        },
      ],
      1,
    );

  let releaseFirst;
  const firstBarrier =
    new Promise((resolve) => {
      releaseFirst = resolve;
    });

  let firstEntered = false;

  const runtime =
    new ToolExecutionCoordinator(
      resolver({
        tool_1111111111111111:
          async () => {
            firstEntered = true;
            await firstBarrier;
            return output('succeeded', {
              completedAtMs: NOW + 200,
            });
          },
      }),
      () => NOW + 100,
      null,
      concurrency,
    );

  const first =
    runtime.execute(
      input({ maxAttempts: 1 }),
    );

  while (!firstEntered) {
    await new Promise(
      (resolve) => setTimeout(resolve, 0),
    );
  }

  const duplicate =
    await runtime.execute(
      input({ maxAttempts: 1 }),
    );

  assert.equal(duplicate.status, 'failed');
  assert.equal(
    duplicate.failureReason,
    'operation_in_progress',
  );

  releaseFirst();
  const completed = await first;

  assert.equal(completed.status, 'succeeded');
  assert.equal(
    concurrency.snapshot(NOW + 300).length,
    0,
  );
});
