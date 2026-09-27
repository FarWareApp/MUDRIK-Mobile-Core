import assert from 'node:assert/strict';
import os from 'node:os';
import test from 'node:test';

import {
  normalizeToolStep,
  parseTerminalToolInput,
  policyContextForToolStep,
} from '../src/tool-contracts.mjs';

function terminalStep(
  overrides = {},
) {
  return {
    stepId:
      'cstep_aaaaaaaaaaaaaaaa',
    tool: 'terminal',
    summary: 'Run safe command',
    requiredCapabilities: [
      'terminal.execute',
    ],
    input: {
      executable:
        process.execPath,
      args: [
        '-e',
        'console.log("ok")',
      ],
      cwd: os.tmpdir(),
    },
    continueOnError: false,
    ...overrides,
  };
}

test(
  'terminal contract normalizes effective execution defaults',
  () => {
    const parsed =
      parseTerminalToolInput({
        executable:
          process.execPath,
        cwd: os.tmpdir(),
      });

    assert.ok(parsed);
    assert.deepEqual(
      parsed.args,
      [],
    );
    assert.equal(
      parsed.cwd,
      os.tmpdir(),
    );
    assert.equal(
      parsed.timeoutMs,
      120_000,
    );
    assert.equal(
      parsed.maxOutputBytes,
      2 * 1024 * 1024,
    );
    assert.deepEqual(
      parsed.env,
      {},
    );
  },
);

test(
  'terminal contract rejects unknown input fields relative executables and elevation',
  () => {
    assert.equal(
      parseTerminalToolInput({
        executable:
          process.execPath,
        cwd: os.tmpdir(),
        shell: true,
      }),
      null,
    );

    assert.equal(
      parseTerminalToolInput({
        executable: 'node',
        cwd: os.tmpdir(),
      }),
      null,
    );

    assert.equal(
      parseTerminalToolInput({
        executable:
          process.execPath,
        cwd: os.tmpdir(),
        requiresElevation: true,
      }),
      null,
    );
  },
);

test(
  'terminal contract rejects dangerous and credential-like environment variables',
  () => {
    for (const env of [
      {
        PATH: '/tmp/hostile',
      },
      {
        NODE_OPTIONS:
          '--require=/tmp/hostile.js',
      },
      {
        LD_PRELOAD:
          '/tmp/hostile.so',
      },
      {
        OPENAI_API_KEY:
          'not-a-real-secret',
      },
      {
        SERVICE_TOKEN:
          'not-a-real-secret',
      },
    ]) {
      assert.equal(
        parseTerminalToolInput({
          executable:
            process.execPath,
          cwd: os.tmpdir(),
          env,
        }),
        null,
      );
    }
  },
);

test(
  'terminal contract accepts bounded non-secret environment values',
  () => {
    const parsed =
      parseTerminalToolInput({
        executable:
          process.execPath,
        cwd: os.tmpdir(),
        env: {
          NODE_ENV: 'test',
          CI: '1',
          NO_COLOR: '1',
        },
      });

    assert.ok(parsed);
    assert.deepEqual(
      parsed.env,
      {
        NODE_ENV: 'test',
        CI: '1',
        NO_COLOR: '1',
      },
    );
  },
);

test(
  'terminal tool requires terminal.execute and exposes exact policy context',
  () => {
    const missingCapability =
      normalizeToolStep(
        terminalStep({
          requiredCapabilities: [
            'filesystem.read',
          ],
        }),
      );

    assert.equal(
      missingCapability,
      null,
    );

    const context =
      policyContextForToolStep(
        terminalStep(),
      );

    assert.deepEqual(
      context[
        'terminal.execute'
      ],
      {
        cwd: os.tmpdir(),
        executable:
          process.execPath,
        timeoutMs: 120_000,
        requiresElevation: false,
        minimumRisk: 'medium',
      },
    );
  },
);
