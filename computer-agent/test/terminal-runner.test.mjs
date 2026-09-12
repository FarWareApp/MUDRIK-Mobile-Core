import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { ComputerTaskRunner } from '../src/task-runner.mjs';
import { runTerminalCommand } from '../src/tools/terminal.mjs';

function futureIso(minutes = 10) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function executionGrant(root) {
  return {
    grantId: 'grant-terminal-test',
    deviceId: 'device-test',
    capability: 'terminal.execute',
    mode: 'session',
    scope: {
      filesystemRoots: [root],
      executables: [process.execPath],
    },
    createdAt: new Date().toISOString(),
    expiresAt: futureIso(),
  };
}

test('terminal adapter executes argv without a shell', async () => {
  const result = await runTerminalCommand({
    executable: process.execPath,
    args: ['-e', 'console.log("mudrik-terminal-ok")'],
    cwd: os.tmpdir(),
    timeoutMs: 5_000,
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.timedOut, false);
  assert.match(result.stdout, /mudrik-terminal-ok/);
});

test('task runner blocks ungranted terminal work', async () => {
  const runner = new ComputerTaskRunner();

  const result = await runner.run({
    taskId: 'blocked-task',
    intent: 'Run a local test command',
    risk: 'medium',
    requestedCapabilities: ['terminal.execute'],
    expiresAt: futureIso(),
    steps: [
      {
        stepId: 'step-1',
        tool: 'terminal',
        summary: 'Print a line',
        requiredCapabilities: ['terminal.execute'],
        input: {
          executable: process.execPath,
          args: ['-e', 'console.log("blocked")'],
          cwd: os.tmpdir(),
        },
      },
    ],
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.policy.reason, 'approval-required');
});

test('task runner executes inside an approved scope and emits progress', async () => {
  const root = os.tmpdir();
  const events = [];

  const runner = new ComputerTaskRunner({
    grants: [executionGrant(root)],
    onEvent: (event) => events.push(event),
  });

  const result = await runner.run({
    taskId: 'allowed-task',
    intent: 'Run a local test command',
    risk: 'medium',
    requestedCapabilities: ['terminal.execute'],
    expiresAt: futureIso(),
    steps: [
      {
        stepId: 'step-1',
        tool: 'terminal',
        summary: 'Print a line',
        requiredCapabilities: ['terminal.execute'],
        input: {
          executable: process.execPath,
          args: ['-e', 'console.log("mudrik-runner-ok")'],
          cwd: root,
        },
      },
    ],
  });

  assert.equal(result.status, 'succeeded');
  assert.equal(result.steps[0].result.exitCode, 0);
  assert.match(result.steps[0].result.stdout, /mudrik-runner-ok/);
  assert.ok(events.some((event) => event.type === 'task.started'));
  assert.ok(events.some((event) => event.type === 'task.succeeded'));
});

test('task runner re-checks scope for every step', async () => {
  const allowedRoot = path.join(os.tmpdir(), 'mudrik-allowed-root');
  const outsideRoot = path.join(os.tmpdir(), 'mudrik-outside-root');

  const runner = new ComputerTaskRunner({
    grants: [executionGrant(allowedRoot)],
  });

  const result = await runner.run({
    taskId: 'scope-escape-task',
    intent: 'Attempt to leave approved workspace',
    risk: 'medium',
    requestedCapabilities: ['terminal.execute'],
    expiresAt: futureIso(),
    steps: [
      {
        stepId: 'step-1',
        tool: 'terminal',
        summary: 'Outside scope command',
        requiredCapabilities: ['terminal.execute'],
        input: {
          executable: process.execPath,
          args: ['-e', 'console.log("must-not-run")'],
          cwd: outsideRoot,
        },
      },
    ],
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.policy.reason, 'approval-required');
});
