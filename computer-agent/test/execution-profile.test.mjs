import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  parseExecutionProfileInput,
  resolveExecutionProfile,
} from '../src/execution-profile.mjs';

import {
  LinuxBubblewrapSandbox,
} from '../src/linux-bubblewrap-sandbox.mjs';

import {
  ComputerTaskRunner,
} from '../src/task-runner.mjs';

import {
  normalizeToolStep,
  policyContextForToolStep,
} from '../src/tool-contracts.mjs';

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

function grant(
  root,
  profiles,
) {
  return {
    grantId:
      'grant-terminal-profiles',
    deviceId: 'device-test',
    capability:
      'terminal.execute',
    mode: 'session',
    scope: {
      filesystemRoots: [root],
      executionProfiles: profiles,
      maxTaskDurationSeconds: 600,
    },
    createdAt: pastIso(),
    expiresAt: futureIso(),
  };
}

async function fixture(t) {
  const root =
    await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        'mudrik-profile-',
      ),
    );

  t.after(
    () => fs.rm(
      root,
      {
        recursive: true,
        force: true,
      },
    ),
  );

  const sandbox =
    new LinuxBubblewrapSandbox();

  if (!await sandbox.available()) {
    t.skip('bubblewrap unavailable');
    return null;
  }

  return {
    root,
    sandbox,
  };
}

test(
  'execution profile contract rejects arbitrary executable and path traversal',
  () => {
    assert.equal(
      parseExecutionProfileInput({
        executionProfile:
          'unknown.profile',
        cwd: '/tmp/work',
      }),
      null,
    );

    assert.equal(
      parseExecutionProfileInput({
        executionProfile:
          'node.test',
        cwd: '/tmp/work',
        executable: '/bin/sh',
      }),
      null,
    );

    assert.equal(
      parseExecutionProfileInput({
        executionProfile:
          'node.test',
        cwd: '/tmp/work',
        paths: [
          '../outside.test.mjs',
        ],
      }),
      null,
    );

    assert.equal(
      parseExecutionProfileInput({
        executionProfile:
          'npm.script',
        cwd: '/tmp/work',
        script: 'test;id',
      }),
      null,
    );

    assert.equal(
      parseExecutionProfileInput({
        executionProfile:
          'npm.script',
        cwd: '/tmp/work',
        script: 'test',
        scriptArgs: [
          ';id',
        ],
      }),
      null,
    );

    assert.equal(
      parseExecutionProfileInput({
        executionProfile:
          'npm.script',
        cwd: '/tmp/work',
        script: 'test',
        scriptArgs: [
          '../outside',
        ],
      }),
      null,
    );
  },
);

test(
  'execution profile policy uses exact profile id and workspace scope',
  () => {
    const normalized =
      normalizeToolStep({
        tool: 'terminal',
        requiredCapabilities: [
          'terminal.execute',
        ],
        input: {
          executionProfile:
            'node.test',
          cwd: '/tmp/work',
          paths: [
            'test/example.test.mjs',
          ],
        },
      });

    assert.ok(normalized);

    const context =
      policyContextForToolStep(
        normalized,
      );

    assert.equal(
      context['terminal.execute']
        .executionProfile,
      'node.test',
    );
    assert.equal(
      context['terminal.execute']
        .cwd,
      '/tmp/work',
    );
    assert.equal(
      Object.hasOwn(
        context['terminal.execute'],
        'executable',
      ),
      false,
    );
  },
);

test(
  'node.test profile executes inside Bubblewrap without shell or network',
  {
    skip:
      process.platform !== 'linux',
  },
  async (t) => {
    const f = await fixture(t);

    if (!f) {
      return;
    }

    const testDir =
      path.join(f.root, 'test');

    await fs.mkdir(testDir);

    await fs.writeFile(
      path.join(
        testDir,
        'sample.test.mjs',
      ),
      [
        "import test from 'node:test';",
        "import assert from 'node:assert/strict';",
        "test('profile',()=>assert.equal(2+2,4));",
        '',
      ].join('\n'),
    );

    const runner =
      new ComputerTaskRunner({
        grants: [
          grant(
            f.root,
            ['node.test'],
          ),
        ],
        terminalSandbox:
          f.sandbox,
      });

    const result =
      await runner.run({
        taskId:
          'profile-node-test',
        deviceId: 'device-test',
        intent:
          'Run bounded node tests',
        risk: 'medium',
        requestedCapabilities: [
          'terminal.execute',
        ],
        expiresAt: futureIso(),
        steps: [{
          stepId: 'step-node-test',
          tool: 'terminal',
          summary:
            'Run node tests',
          requiredCapabilities: [
            'terminal.execute',
          ],
          input: {
            executionProfile:
              'node.test',
            cwd: f.root,
            paths: [
              'test/sample.test.mjs',
            ],
            timeoutMs: 30_000,
          },
        }],
      });

    assert.equal(
      result.status,
      'succeeded',
    );
    assert.equal(
      result.steps[0]
        .result.exitCode,
      0,
      result.steps[0]
        .result.stderr,
    );
    assert.equal(
      result.steps[0]
        .result.network,
      'isolated',
    );
  },
);

test(
  'profile absent from grant is blocked before execution',
  {
    skip:
      process.platform !== 'linux',
  },
  async (t) => {
    const f = await fixture(t);

    if (!f) {
      return;
    }

    const runner =
      new ComputerTaskRunner({
        grants: [
          grant(
            f.root,
            ['node.test'],
          ),
        ],
        terminalSandbox:
          f.sandbox,
      });

    const result =
      await runner.run({
        taskId:
          'profile-not-granted',
        deviceId: 'device-test',
        intent:
          'Attempt ungranted profile',
        risk: 'medium',
        requestedCapabilities: [
          'terminal.execute',
        ],
        expiresAt: futureIso(),
        steps: [{
          stepId: 'step-npm',
          tool: 'terminal',
          summary: 'Run npm script',
          requiredCapabilities: [
            'terminal.execute',
          ],
          input: {
            executionProfile:
              'npm.script',
            cwd: f.root,
            script: 'test',
          },
        }],
      });

    assert.equal(
      result.status,
      'blocked',
    );
    assert.equal(
      result.policy.reason,
      'approval-required',
    );
  },
);

test(
  'npm.script profile resolves trusted npm CLI and executes local package script in sandbox',
  {
    skip:
      process.platform !== 'linux',
  },
  async (t) => {
    const f = await fixture(t);

    if (!f) {
      return;
    }

    await fs.writeFile(
      path.join(
        f.root,
        'package.json',
      ),
      JSON.stringify({
        name: 'profile-fixture',
        private: true,
        scripts: {
          verify:
            'node -e "process.stdout.write(\'PROFILE_OK\')"',
        },
      }),
    );

    const resolved =
      await resolveExecutionProfile({
        executionProfile:
          'npm.script',
        cwd: f.root,
        script: 'verify',
      });

    assert.equal(
      resolved.executable,
      process.execPath,
    );
    assert.equal(
      resolved.args[1],
      'run',
    );
    assert.equal(
      resolved.args[3],
      'verify',
    );
    assert.equal(
      resolved.readOnlyRoots.length,
      1,
    );

    const runner =
      new ComputerTaskRunner({
        grants: [
          grant(
            f.root,
            ['npm.script'],
          ),
        ],
        terminalSandbox:
          f.sandbox,
      });

    const result =
      await runner.run({
        taskId:
          'profile-npm-script',
        deviceId: 'device-test',
        intent:
          'Run bounded npm script',
        risk: 'medium',
        requestedCapabilities: [
          'terminal.execute',
        ],
        expiresAt: futureIso(),
        steps: [{
          stepId: 'step-npm-script',
          tool: 'terminal',
          summary:
            'Run package verify script',
          requiredCapabilities: [
            'terminal.execute',
          ],
          input: {
            executionProfile:
              'npm.script',
            cwd: f.root,
            script: 'verify',
            timeoutMs: 30_000,
          },
        }],
      });

    assert.equal(
      result.status,
      'succeeded',
    );
    assert.equal(
      result.steps[0]
        .result.exitCode,
      0,
      result.steps[0]
        .result.stderr,
    );
    assert.match(
      result.steps[0]
        .result.stdout,
      /PROFILE_OK/,
    );
    assert.equal(
      result.steps[0]
        .result.network,
      'isolated',
    );
  },
);

test(
  'execution profile output is bounded and truncation is reported',
  {
    skip:
      process.platform !== 'linux',
  },
  async (t) => {
    const f = await fixture(t);

    if (!f) {
      return;
    }

    await fs.writeFile(
      path.join(
        f.root,
        'noisy.test.mjs',
      ),
      [
        "import test from 'node:test';",
        "test('noisy',()=>{process.stdout.write('X'.repeat(20000));});",
        '',
      ].join('\n'),
    );

    const runner =
      new ComputerTaskRunner({
        grants: [
          grant(
            f.root,
            ['node.test'],
          ),
        ],
        terminalSandbox:
          f.sandbox,
      });

    const result =
      await runner.run({
        taskId:
          'profile-output-bound',
        deviceId: 'device-test',
        intent:
          'Bound profile output',
        risk: 'medium',
        requestedCapabilities: [
          'terminal.execute',
        ],
        expiresAt: futureIso(),
        steps: [{
          stepId: 'step-noisy',
          tool: 'terminal',
          summary:
            'Run noisy test',
          requiredCapabilities: [
            'terminal.execute',
          ],
          input: {
            executionProfile:
              'node.test',
            cwd: f.root,
            paths: [
              'noisy.test.mjs',
            ],
            maxOutputBytes: 1024,
            timeoutMs: 30_000,
          },
        }],
      });

    assert.equal(
      result.status,
      'succeeded',
    );
    assert.equal(
      result.steps[0]
        .result.stdoutTruncated,
      true,
    );
    assert.ok(
      Buffer.byteLength(
        result.steps[0]
          .result.stdout,
        'utf8',
      ) <= 1024,
    );
  },
);

test(
  'execution profile timeout terminates runaway work',
  {
    skip:
      process.platform !== 'linux',
  },
  async (t) => {
    const f = await fixture(t);

    if (!f) {
      return;
    }

    await fs.writeFile(
      path.join(
        f.root,
        'hang.test.mjs',
      ),
      [
        "import test from 'node:test';",
        "test('hang',async()=>{await new Promise(r=>setTimeout(r,10000));});",
        '',
      ].join('\n'),
    );

    const runner =
      new ComputerTaskRunner({
        grants: [
          grant(
            f.root,
            ['node.test'],
          ),
        ],
        terminalSandbox:
          f.sandbox,
      });

    const result =
      await runner.run({
        taskId:
          'profile-timeout-bound',
        deviceId: 'device-test',
        intent:
          'Bound profile duration',
        risk: 'medium',
        requestedCapabilities: [
          'terminal.execute',
        ],
        expiresAt: futureIso(),
        steps: [{
          stepId: 'step-hang',
          tool: 'terminal',
          summary:
            'Run hanging test',
          requiredCapabilities: [
            'terminal.execute',
          ],
          input: {
            executionProfile:
              'node.test',
            cwd: f.root,
            paths: [
              'hang.test.mjs',
            ],
            timeoutMs: 250,
          },
        }],
      });

    assert.equal(
      result.status,
      'failed',
    );
    assert.equal(
      result.steps[0]
        .result.timedOut,
      true,
    );
  },
);
