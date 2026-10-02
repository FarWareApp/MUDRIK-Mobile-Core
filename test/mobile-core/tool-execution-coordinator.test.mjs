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

test('malformed adapter output never becomes success', async () => {
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
          async () =>
            output('succeeded', {
              completedAtMs: NOW + 400,
            }),
      }),
      () => NOW + 100,
    );

  const result =
    await runtime.execute(input());

  assert.equal(result.status, 'succeeded');
  assert.equal(result.attempts, 2);
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
