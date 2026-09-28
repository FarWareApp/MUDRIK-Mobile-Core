import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  ComputerTaskRunner,
} from '../src/task-runner.mjs';

import {
  LinuxBubblewrapSandbox,
} from '../src/linux-bubblewrap-sandbox.mjs';

import {
  runTerminalCommand,
} from '../src/tools/terminal.mjs';

const GIT = '/usr/bin/git';

async function hostGit(cwd, args) {
  const result =
    await runTerminalCommand({
      executable: GIT,
      args,
      cwd,
      env: {},
      timeoutMs: 10_000,
      maxOutputBytes: 128 * 1024,
    });

  assert.equal(
    result.exitCode,
    0,
    result.stderr,
  );
}

function grant(
  repository,
  capability,
) {
  return {
    grantId:
      'grant-' + capability.replace('.', '-'),
    deviceId: 'device-test',
    capability,
    mode: 'session',
    scope: {
      repositories: [repository],
    },
    createdAt:
      new Date(
        Date.now() - 60_000,
      ).toISOString(),
    expiresAt:
      new Date(
        Date.now() + 600_000,
      ).toISOString(),
  };
}

async function fixture(t) {
  const root =
    await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        'mudrik-git-runner-',
      ),
    );
  const allowed =
    path.join(root, 'allowed');
  const other =
    path.join(root, 'other');

  await fs.mkdir(allowed);
  await fs.mkdir(other);
  await hostGit(allowed, ['init']);
  await hostGit(other, ['init']);

  t.after(
    () => fs.rm(
      root,
      {
        recursive: true,
        force: true,
      },
    ),
  );

  return {
    root,
    allowed,
    other,
  };
}

test(
  'runner enforces exact Git repository grant scope',
  {
    skip:
      process.platform !== 'linux',
  },
  async (t) => {
    const f = await fixture(t);
    const sandbox =
      new LinuxBubblewrapSandbox();

    if (!await sandbox.available()) {
      t.skip('bubblewrap unavailable');
      return;
    }

    const runner =
      new ComputerTaskRunner({
        grants: [
          grant(
            f.allowed,
            'git.read',
          ),
        ],
        terminalSandbox: sandbox,
      });

    const taskBase = {
      taskId: 'git-runner-task',
      deviceId: 'device-test',
      intent: 'Read repository status',
      risk: 'low',
      requestedCapabilities: [
        'git.read',
      ],
      expiresAt:
        new Date(
          Date.now() + 600_000,
        ).toISOString(),
    };

    const denied =
      await runner.run({
        ...taskBase,
        steps: [{
          stepId: 'step-other',
          tool: 'git',
          summary: 'Other repo',
          requiredCapabilities: [
            'git.read',
          ],
          input: {
            operation: 'status',
            repository: f.other,
          },
        }],
      });

    assert.equal(
      denied.status,
      'blocked',
    );
    assert.equal(
      denied.policy.reason,
      'approval-required',
    );

    const allowed =
      await runner.run({
        ...taskBase,
        taskId:
          'git-runner-task-allowed',
        steps: [{
          stepId: 'step-allowed',
          tool: 'git',
          summary: 'Allowed repo',
          requiredCapabilities: [
            'git.read',
          ],
          input: {
            operation: 'status',
            repository: f.allowed,
          },
        }],
      });

    assert.equal(
      allowed.status,
      'succeeded',
    );
    assert.equal(
      allowed.steps[0]
        .result.operation,
      'status',
    );
  },
);
