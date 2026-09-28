import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  gitCapabilitiesFor,
  gitPolicyContext,
  gitRiskFor,
  normalizeGitStep,
  parseGitToolInput,
} from '../src/git-contract.mjs';

import {
  LinuxBubblewrapSandbox,
} from '../src/linux-bubblewrap-sandbox.mjs';

import {
  GitToolError,
  runGitOperation,
} from '../src/tools/git.mjs';

import {
  runTerminalCommand,
} from '../src/tools/terminal.mjs';

const GIT = '/usr/bin/git';
async function hostGit(
  cwd,
  args,
) {
  const result =
    await runTerminalCommand({
      executable: GIT,
      args,
      cwd,
      env: {
        GIT_TERMINAL_PROMPT: '0',
      },
      timeoutMs: 10_000,
      maxOutputBytes:
        256 * 1024,
    });

  assert.equal(
    result.exitCode,
    0,
    result.stderr,
  );

  return result;
}

async function fixture(t) {
  const root =
    await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        'mudrik-git-',
      ),
    );
  const repo =
    path.join(root, 'repo');

  await fs.mkdir(repo);
  await hostGit(repo, ['init']);
  await fs.writeFile(
    path.join(repo, 'a.txt'),
    'one\n',
  );
  await hostGit(
    repo,
    ['add', '--', 'a.txt'],
  );
  await hostGit(
    repo,
    [
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.test',
      'commit',
      '-m',
      'initial',
    ],
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

  return {
    root,
    repo,
    sandbox:
      new LinuxBubblewrapSandbox(),
  };
}
test(
  'Git contract separates local read write network and destructive risk',
  () => {
    assert.deepEqual(
      gitCapabilitiesFor('status'),
      ['git.read'],
    );
    assert.deepEqual(
      gitCapabilitiesFor('commit'),
      ['git.write'],
    );
    assert.deepEqual(
      gitCapabilitiesFor('push'),
      [
        'git.write',
        'network.outbound',
      ],
    );
    assert.equal(
      gitRiskFor('reset_hard'),
      'high',
    );
    assert.equal(
      gitRiskFor('force_push'),
      'critical',
    );
  },
);

test(
  'Git contract rejects unknown fields absolute pathspecs and capability substitution',
  () => {
    assert.equal(
      parseGitToolInput({
        operation: 'status',
        repository: '/tmp/repo',
        hidden: true,
      }),
      null,
    );
    assert.equal(
      parseGitToolInput({
        operation: 'add',
        repository: '/tmp/repo',
        paths: ['/etc/passwd'],
      }),
      null,
    );

    assert.equal(
      normalizeGitStep({
        tool: 'git',
        requiredCapabilities: [
          'filesystem.write',
        ],
        input: {
          operation: 'add',
          repository: '/tmp/repo',
          paths: ['a.txt'],
        },
      }),
      null,
    );

    const push =
      normalizeGitStep({
        tool: 'git',
        requiredCapabilities: [
          'git.write',
          'network.outbound',
        ],
        input: {
          operation: 'push',
          repository: '/tmp/repo',
          remote: 'origin',
          remoteHost:
            'example.test',
          refspec:
            'HEAD:refs/heads/main',
        },
      });

    assert.ok(push);
    const context =
      gitPolicyContext(push);

    assert.equal(
      context['git.write']
        .minimumRisk,
      'high',
    );
    assert.equal(
      context['network.outbound']
        .domain,
      'example.test',
    );
  },
);

test(
  'Git read operations run against a read-only repository mount',
  {
    skip:
      process.platform !== 'linux',
  },
  async (t) => {
    const f = await fixture(t);

    if (!await f.sandbox.available()) {
      t.skip('bubblewrap unavailable');
      return;
    }

    await fs.writeFile(
      path.join(f.repo, 'a.txt'),
      'two\n',
    );

    const status =
      await runGitOperation(
        {
          operation: 'status',
          repository: f.repo,
        },
        {
          allowedRepositories: [
            f.repo,
          ],
          sandbox: f.sandbox,
        },
      );

    assert.equal(status.exitCode, 0);
    assert.match(
      status.stdout,
      /a\.txt/,
    );
    assert.equal(
      status.network,
      'isolated',
    );

    const diff =
      await runGitOperation(
        {
          operation: 'diff',
          repository: f.repo,
          paths:
            Object.freeze(['a.txt']),
          staged: false,
          maxBytes: 64 * 1024,
        },
        {
          allowedRepositories: [
            f.repo,
          ],
          sandbox: f.sandbox,
        },
      );

    assert.equal(diff.exitCode, 0);
    assert.match(
      diff.stdout,
      /-one/,
    );
    assert.match(
      diff.stdout,
      /\+two/,
    );
  },
);
test(
  'Git local write can add and commit explicit paths without running repository hooks',
  {
    skip:
      process.platform !== 'linux',
  },
  async (t) => {
    const f = await fixture(t);

    if (!await f.sandbox.available()) {
      t.skip('bubblewrap unavailable');
      return;
    }

    const hook =
      path.join(
        f.repo,
        '.git',
        'hooks',
        'pre-commit',
      );
    const marker =
      path.join(
        f.repo,
        'hook-ran',
      );

    await fs.writeFile(
      hook,
      '#!/bin/sh\ntouch '
        + JSON.stringify(marker)
        + '\nexit 9\n',
      { mode: 0o700 },
    );

    await fs.writeFile(
      path.join(f.repo, 'a.txt'),
      'three\n',
    );
    const added =
      await runGitOperation(
        {
          operation: 'add',
          repository: f.repo,
          paths:
            Object.freeze(['a.txt']),
        },
        {
          allowedRepositories: [
            f.repo,
          ],
          sandbox: f.sandbox,
        },
      );

    assert.equal(added.exitCode, 0);

    const committed =
      await runGitOperation(
        {
          operation: 'commit',
          repository: f.repo,
          paths:
            Object.freeze(['a.txt']),
          message:
            'bounded commit',
          authorName:
            'MUDRIK Test',
          authorEmail:
            'mudrik@example.test',
        },
        {
          allowedRepositories: [
            f.repo,
          ],
          sandbox: f.sandbox,
        },
      );

    assert.equal(
      committed.exitCode,
      0,
      committed.stderr,
    );
    await assert.rejects(
      () => fs.access(marker),
    );

    const log =
      await hostGit(
        f.repo,
        [
          'log',
          '-1',
          '--format=%s',
        ],
      );

    assert.equal(
      log.stdout.trim(),
      'bounded commit',
    );
  },
);

test(
  'Git repository scope is exact and symlink repositories fail closed',
  {
    skip:
      process.platform !== 'linux',
  },
  async (t) => {
    const f = await fixture(t);

    if (!await f.sandbox.available()) {
      t.skip('bubblewrap unavailable');
      return;
    }

    const other =
      path.join(
        f.root,
        'other',
      );
    await fs.mkdir(other);
    await hostGit(other, ['init']);

    await assert.rejects(
      () => runGitOperation(
        {
          operation: 'status',
          repository: other,
        },
        {
          allowedRepositories: [
            f.repo,
          ],
          sandbox: f.sandbox,
        },
      ),
      (error) =>
        error instanceof GitToolError
        && error.code
          === 'git_repository_denied',
    );

    const link =
      path.join(
        f.root,
        'repo-link',
      );
    await fs.symlink(
      f.repo,
      link,
    );

    await assert.rejects(
      () => runGitOperation(
        {
          operation: 'status',
          repository: link,
        },
        {
          allowedRepositories: [
            link,
          ],
          sandbox: f.sandbox,
        },
      ),
      /git_repository_denied/,
    );
  },
);
test(
  'network and destructive Git operations remain explicitly unavailable',
  {
    skip:
      process.platform !== 'linux',
  },
  async (t) => {
    const f = await fixture(t);

    const cases = [
      {
        operation: 'push',
        repository: f.repo,
        remote: 'origin',
        remoteHost: 'example.test',
        refspec:
          'HEAD:refs/heads/main',
      },
      {
        operation: 'force_push',
        repository: f.repo,
        remote: 'origin',
        remoteHost: 'example.test',
        refspec:
          'HEAD:refs/heads/main',
      },
    ];

    for (const input of cases) {
      await assert.rejects(
        () => runGitOperation(
          input,
          {
            allowedRepositories: [
              f.repo,
            ],
            sandbox: f.sandbox,
          },
        ),
        /git_network_operation_unavailable/,
      );
    }
    for (
      const operation of [
        'reset_hard',
        'clean',
      ]
    ) {
      await assert.rejects(
        () => runGitOperation(
          {
            operation,
            repository: f.repo,
          },
          {
            allowedRepositories: [
              f.repo,
            ],
            sandbox: f.sandbox,
          },
        ),
        /git_destructive_operation_unavailable/,
      );
    }
  },
);
