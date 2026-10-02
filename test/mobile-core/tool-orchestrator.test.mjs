import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadTypeScriptModule,
} from './loadTypeScriptModule.mjs';

const {
  routeToolRequest,
  validateToolRegistration,
  validateToolRouteRequest,
} = loadTypeScriptModule(
  'src/core/tools/toolOrchestrator.ts',
);

const NOW = 2_800_000_000;

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
    executionMode:
      index === 1 ? 'local' : 'remote',
    health: 'ready',
    trustScore: 900 - index,
    qualityScore: 850 - index,
    firstResultMs: 100 + index,
    maxConcurrent: 4,
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

function request(overrides = {}) {
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
    ...overrides,
  };
}

test('tool contracts reject authority escalation and duplicate capabilities', () => {
  assert.equal(
    validateToolRegistration(
      registration(1),
    ),
    true,
  );

  assert.equal(
    validateToolRegistration(
      registration(1, {
        grantsExecutionAuthority: true,
      }),
    ),
    false,
  );

  assert.equal(
    validateToolRouteRequest(
      request({
        requiredCapabilities: [
          'filesystem.write',
          'filesystem.write',
        ],
      }),
    ),
    false,
  );
});

test('router prefers trusted local reversible tool and keeps bounded fallback', () => {
  const decision =
    routeToolRequest(
      request(),
      [
        registration(1),
        registration(2, {
          trustScore: 950,
          qualityScore: 900,
          firstResultMs: 500,
        }),
        registration(3, {
          trustScore: 700,
          qualityScore: 700,
        }),
      ],
    );

  assert.equal(decision.accepted, true);
  assert.equal(decision.reason, 'routed');
  assert.equal(
    decision.primary?.toolRef,
    'tool_1111111111111111',
  );
  assert.equal(decision.fallbacks.length, 2);
  assert.deepEqual(
    [
      decision.primary?.rank,
      ...decision.fallbacks.map(
        (item) => item.rank,
      ),
    ],
    [1, 2, 3],
  );
});

test('unavailable or under-capable tools are excluded', () => {
  const decision =
    routeToolRequest(
      request(),
      [
        registration(1, {
          health: 'unavailable',
        }),
        registration(2, {
          capabilities: [
            'filesystem.read',
          ],
        }),
      ],
    );

  assert.equal(decision.accepted, false);
  assert.equal(
    decision.reason,
    'no_eligible_tool',
  );
});

test('reversible side effects require rollback-capable tool', () => {
  const decision =
    routeToolRequest(
      request(),
      [
        registration(1, {
          supportsRollback: false,
        }),
        registration(2, {
          sideEffectSupport: 'none',
        }),
      ],
    );

  assert.equal(decision.accepted, false);
  assert.equal(
    decision.reason,
    'no_eligible_tool',
  );
});

test('irreversible request only routes to explicit any-side-effect tool', () => {
  const decision =
    routeToolRequest(
      request({
        rollbackRef: null,
      }),
      [
        registration(1),
        registration(2, {
          sideEffectSupport: 'any',
          supportsRollback: false,
        }),
      ],
    );

  assert.equal(decision.accepted, true);
  assert.equal(
    decision.primary?.toolRef,
    'tool_2222222222222222',
  );
});

test('duplicate tool identities fail closed', () => {
  const duplicate = registration(1);

  const decision =
    routeToolRequest(
      request(),
      [
        duplicate,
        {
          ...duplicate,
          adapterRef:
            'adapter_ref_other_111111111111',
        },
      ],
    );

  assert.equal(decision.accepted, false);
  assert.equal(decision.reason, 'invalid_input');
});
