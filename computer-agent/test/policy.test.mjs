import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { evaluateTaskPolicy, isPathWithinScope } from '../src/policy.mjs';

function futureIso(minutes = 10) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function task(overrides = {}) {
  return {
    taskId: 'task-policy-test',
    deviceId: 'device-test',
    risk: 'medium',
    requestedCapabilities: ['terminal.execute'],
    expiresAt: futureIso(),
    approval: { mode: 'automatic' },
    ...overrides,
  };
}

function grant(overrides = {}) {
  return {
    grantId: 'grant-policy-test',
    deviceId: 'device-test',
    capability: 'terminal.execute',
    mode: 'session',
    scope: {},
    createdAt: new Date().toISOString(),
    expiresAt: futureIso(),
    ...overrides,
  };
}

test('default deny when capability is not granted', () => {
  const result = evaluateTaskPolicy({
    task: task(),
    grants: [],
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'approval-required');
});

test('allows scoped execution when grant covers cwd and executable', () => {
  const root = path.join(os.tmpdir(), 'mudrik-agent-policy');
  const cwd = path.join(root, 'repo');

  const result = evaluateTaskPolicy({
    task: task(),
    grants: [
      grant({
        scope: {
          filesystemRoots: [root],
          executables: [process.execPath],
        },
      }),
    ],
    contextByCapability: {
      'terminal.execute': {
        cwd,
        executable: process.execPath,
      },
    },
  });

  assert.deepEqual(result, {
    allowed: true,
    reason: 'authorized',
    coveringGrantIds: {
      'terminal.execute':
        'grant-policy-test',
    },
  });
});

test('denies execution outside granted filesystem scope', () => {
  const result = evaluateTaskPolicy({
    task: task(),
    grants: [
      grant({
        scope: {
          filesystemRoots: [path.join(os.tmpdir(), 'allowed')],
        },
      }),
    ],
    contextByCapability: {
      'terminal.execute': {
        cwd: path.join(os.tmpdir(), 'different-root'),
      },
    },
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'approval-required');
});

test('high risk requires explicit approval unless persistent policy covers all', () => {
  const withoutApproval = evaluateTaskPolicy({
    task: task({ risk: 'high' }),
    grants: [grant()],
  });

  assert.equal(withoutApproval.allowed, false);
  assert.equal(withoutApproval.reason, 'high-risk-approval-required');

  const persistent = evaluateTaskPolicy({
    task: task({ risk: 'high' }),
    grants: [grant({ mode: 'persistent' })],
  });

  assert.equal(persistent.allowed, true);
});

test('critical risk always requires fresh one-shot approval', () => {
  const denied = evaluateTaskPolicy({
    task: task({ risk: 'critical' }),
    grants: [grant({ mode: 'persistent' })],
  });

  assert.equal(denied.allowed, false);
  assert.equal(denied.reason, 'fresh-critical-approval-required');

  const allowed = evaluateTaskPolicy({
    task: task({
      risk: 'critical',
      approval: {
        mode: 'one_shot',
        approvalId: 'approval-123',
      },
    }),
    grants: [grant({ mode: 'persistent' })],
  });

  assert.equal(allowed.allowed, true);
});

test('path helper rejects sibling-prefix escapes', () => {
  const root = path.join(os.tmpdir(), 'mudrik-root');

  assert.equal(isPathWithinScope(path.join(root, 'repo'), [root]), true);
  assert.equal(isPathWithinScope(`${root}-evil`, [root]), false);
});

test('grant from another device cannot authorize the task', () => {
  const result = evaluateTaskPolicy({
    task: task(),
    grants: [
      grant({
        deviceId: 'device-other',
      }),
    ],
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'approval-required');
});

test('trusted policy time controls expiry instead of ambient clock', () => {
  const now = Date.parse('2026-09-27T20:00:00.000Z');
  const result = evaluateTaskPolicy({
    task: task({
      expiresAt: '2026-09-27T20:00:01.000Z',
    }),
    grants: [
      grant({
        createdAt: '2026-09-27T19:00:00.000Z',
        expiresAt: '2026-09-27T20:00:02.000Z',
      }),
    ],
    trustedNowMs: now,
  });

  assert.equal(result.allowed, true);

  const expired = evaluateTaskPolicy({
    task: task({
      expiresAt: '2026-09-27T20:00:01.000Z',
    }),
    grants: [
      grant({
        createdAt: '2026-09-27T19:00:00.000Z',
        expiresAt: '2026-09-27T20:00:02.000Z',
      }),
    ],
    trustedNowMs: now + 2_000,
  });

  assert.equal(expired.allowed, false);
  assert.equal(expired.reason, 'expired-task');
});

test('malformed grant mode scope and future creation fail closed', () => {
  const now = Date.parse('2026-09-27T20:00:00.000Z');
  const contextByCapability = {
    'terminal.execute': {
      cwd: os.tmpdir(),
      executable: process.execPath,
    },
  };

  const hostileGrants = [
    grant({
      mode: 'forever',
      createdAt: '2026-09-27T19:00:00.000Z',
      expiresAt: '2026-09-27T21:00:00.000Z',
    }),
    grant({
      scope: {
        filesystemRoots: os.tmpdir(),
        executables: [process.execPath],
      },
      createdAt: '2026-09-27T19:00:00.000Z',
      expiresAt: '2026-09-27T21:00:00.000Z',
    }),
    grant({
      createdAt: '2026-09-27T20:00:01.000Z',
      expiresAt: '2026-09-27T21:00:00.000Z',
    }),
  ];

  for (const hostile of hostileGrants) {
    const result = evaluateTaskPolicy({
      task: task({
        expiresAt: '2026-09-27T21:00:00.000Z',
      }),
      grants: [hostile],
      contextByCapability,
      trustedNowMs: now,
    });

    assert.equal(result.allowed, false);
    assert.equal(result.reason, 'approval-required');
  }
});

test('terminal execution context requires explicit cwd and executable scope', () => {
  const now = Date.parse('2026-09-27T20:00:00.000Z');
  const baseGrant = grant({
    scope: {},
    createdAt: '2026-09-27T19:00:00.000Z',
    expiresAt: '2026-09-27T21:00:00.000Z',
  });

  const result = evaluateTaskPolicy({
    task: task({
      expiresAt: '2026-09-27T21:00:00.000Z',
    }),
    grants: [baseGrant],
    contextByCapability: {
      'terminal.execute': {
        cwd: os.tmpdir(),
        executable: process.execPath,
      },
    },
    trustedNowMs: now,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'approval-required');
});

test('grant maximum task duration bounds terminal timeout', () => {
  const now = Date.parse('2026-09-27T20:00:00.000Z');
  const root = os.tmpdir();
  const boundedGrant = grant({
    scope: {
      filesystemRoots: [root],
      executables: [process.execPath],
      maxTaskDurationSeconds: 2,
    },
    createdAt: '2026-09-27T19:00:00.000Z',
    expiresAt: '2026-09-27T21:00:00.000Z',
  });

  const denied = evaluateTaskPolicy({
    task: task({
      expiresAt: '2026-09-27T21:00:00.000Z',
    }),
    grants: [boundedGrant],
    contextByCapability: {
      'terminal.execute': {
        cwd: root,
        executable: process.execPath,
        timeoutMs: 2_001,
      },
    },
    trustedNowMs: now,
  });

  assert.equal(denied.allowed, false);

  const allowed = evaluateTaskPolicy({
    task: task({
      expiresAt: '2026-09-27T21:00:00.000Z',
    }),
    grants: [boundedGrant],
    contextByCapability: {
      'terminal.execute': {
        cwd: root,
        executable: process.execPath,
        timeoutMs: 2_000,
      },
    },
    trustedNowMs: now,
  });

  assert.equal(allowed.allowed, true);
});

test(
  'capability risk floors cannot be lowered by a signed task risk label',
  () => {
    const deleteResult =
      evaluateTaskPolicy({
        task: task({
          risk: 'low',
          requestedCapabilities: [
            'filesystem.delete',
          ],
        }),
        grants: [
          grant({
            capability:
              'filesystem.delete',
          }),
        ],
      });

    assert.equal(
      deleteResult.allowed,
      false,
    );
    assert.equal(
      deleteResult.reason,
      'high-risk-approval-required',
    );

    const adminResult =
      evaluateTaskPolicy({
        task: task({
          risk: 'low',
          requestedCapabilities: [
            'system.admin',
          ],
        }),
        grants: [
          grant({
            capability:
              'system.admin',
            mode: 'persistent',
          }),
        ],
      });

    assert.equal(
      adminResult.allowed,
      false,
    );
    assert.equal(
      adminResult.reason,
      'fresh-critical-approval-required',
    );
  },
);

test(
  'operation policy context may raise but never lower effective risk',
  () => {
    const raised =
      evaluateTaskPolicy({
        task: task({
          risk: 'low',
        }),
        grants: [
          grant(),
        ],
        contextByCapability: {
          'terminal.execute': {
            minimumRisk: 'high',
          },
        },
      });

    assert.equal(
      raised.allowed,
      false,
    );
    assert.equal(
      raised.reason,
      'high-risk-approval-required',
    );

    const ordinary =
      evaluateTaskPolicy({
        task: task({
          risk: 'low',
        }),
        grants: [
          grant(),
        ],
        contextByCapability: {
          'terminal.execute': {
            minimumRisk: 'low',
          },
        },
      });

    assert.equal(
      ordinary.allowed,
      true,
    );
  },
);
