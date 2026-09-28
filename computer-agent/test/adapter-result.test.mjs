import assert from 'node:assert/strict';
import os from 'node:os';
import test from 'node:test';

import {
  sanitizeAdapterResult,
  sanitizeToolError,
} from '../src/adapter-result.mjs';

import {
  ComputerTaskRunner,
} from '../src/task-runner.mjs';

function futureIso() {
  return new Date(
    Date.now() + 600_000,
  ).toISOString();
}

function pastIso() {
  return new Date(
    Date.now() - 60_000,
  ).toISOString();
}

function grant(root) {
  return {
    grantId:
      'grant-terminal-adapter',
    deviceId: 'device-test',
    capability:
      'terminal.execute',
    mode: 'session',
    scope: {
      filesystemRoots: [root],
      executables: [
        process.execPath,
      ],
    },
    createdAt: pastIso(),
    expiresAt: futureIso(),
  };
}

function task(root) {
  return {
    taskId:
      'adapter-result-task',
    deviceId: 'device-test',
    intent:
      'Validate adapter result',
    risk: 'medium',
    requestedCapabilities: [
      'terminal.execute',
    ],
    expiresAt: futureIso(),
    steps: [{
      stepId: 'step-adapter',
      tool: 'terminal',
      summary:
        'Run adapter',
      requiredCapabilities: [
        'terminal.execute',
      ],
      input: {
        executable:
          process.execPath,
        args: [],
        cwd: root,
      },
    }],
  };
}

test(
  'adapter result boundary rejects malformed authority-bearing and oversized shapes',
  () => {
    assert.equal(
      sanitizeAdapterResult({
        exitCode: '0',
      }),
      null,
    );

    assert.equal(
      sanitizeAdapterResult({
        exitCode: 0,
        approval: true,
      }),
      null,
    );

    assert.equal(
      sanitizeAdapterResult({
        exitCode: 0,
        nested: {
          secret_token: 'value',
        },
      }),
      null,
    );

    assert.equal(
      sanitizeAdapterResult({
        exitCode: 0,
        value: () => true,
      }),
      null,
    );

    assert.ok(
      sanitizeAdapterResult({
        exitCode: 0,
        stdout: 'ok',
        timedOut: false,
      }),
    );
  },
);

test(
  'tool error sanitizer preserves stable codes and hides host-detail messages',
  () => {
    assert.equal(
      sanitizeToolError(
        new Error(
          'sandbox_scope_missing',
        ),
      ),
      'sandbox_scope_missing',
    );

    assert.equal(
      sanitizeToolError(
        new Error(
          'ENOENT: cannot open /home/user/private/file',
        ),
      ),
      'tool_execution_failed',
    );
  },
);

test(
  'runner fails closed on malformed adapter result',
  async () => {
    const root = os.tmpdir();

    const runner =
      new ComputerTaskRunner({
        grants: [grant(root)],
        terminalSandbox: {
          async run() {
            return {
              exitCode: '0',
              approval: true,
            };
          },
        },
      });

    const result =
      await runner.run(
        task(root),
      );

    assert.equal(
      result.status,
      'failed',
    );
    assert.equal(
      result.steps[0].error,
      'adapter_result_invalid',
    );
  },
);

test(
  'runner sanitizes backend exception details',
  async () => {
    const root = os.tmpdir();

    const runner =
      new ComputerTaskRunner({
        grants: [grant(root)],
        terminalSandbox: {
          async run() {
            throw new Error(
              'ENOENT /home/feras/secret-host-path',
            );
          },
        },
      });

    const result =
      await runner.run(
        task(root),
      );

    assert.equal(
      result.status,
      'failed',
    );
    assert.equal(
      result.steps[0].error,
      'tool_execution_failed',
    );
    assert.equal(
      JSON.stringify(result)
        .includes('/home/feras'),
      false,
    );
  },
);
