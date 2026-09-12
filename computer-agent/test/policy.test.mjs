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
